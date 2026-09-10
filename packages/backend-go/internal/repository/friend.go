package repository

import (
	"backend-go/internal/model"
	"context"
	"errors"

	"gorm.io/gorm"
)

// 接口保持不变
type FriendRepository interface {
	AddFriend(ctx context.Context, userId, friendId uint) (*model.Room, error)
	DeleteFriend(ctx context.Context, userId, friendId uint) error
	GetFriends(ctx context.Context, userId uint) ([]*model.User, error) // 返回值变了，直接返回 User 列表
	IsFriend(ctx context.Context, userId, friendId uint) (bool, error)
}

type friendRepository struct {
	*Repository
}

func NewFriendRepository(r *Repository) FriendRepository {
	return &friendRepository{Repository: r}
}

// AddFriend 添加好友 + 创建私聊房间
func (r *friendRepository) AddFriend(ctx context.Context, userId, friendId uint) (*model.Room, error) {
	if userId == friendId {
		return nil, errors.New("cannot add self as friend")
	}

	// 检查是否已经是好友 (复用之前的逻辑，建议加上)
	isFriend, _ := r.IsFriend(ctx, userId, friendId)
	if isFriend {
		return nil, errors.New("already friends")
	}

	var createdRoom *model.Room

	err := r.DB(ctx).Transaction(func(tx *gorm.DB) error {
		user := model.User{ID: userId}
		friend := model.User{ID: friendId}

		// 1. 建立好友关系 (双向)
		// A -> B
		if err := tx.Model(&user).Association("Friends").Append(&friend); err != nil {
			return err
		}
		// B -> A
		if err := tx.Model(&friend).Association("Friends").Append(&user); err != nil {
			return err
		}

		// 2. 创建私聊房间 (Room)
		// 直接初始化 Room 并带上 Members，Gorm 会自动处理中间表 room_members
		privateRoom := model.Room{
			ChannelType: model.RoomTypePrivate,
			// 私聊房间通常不需要名字，或者你可以生成一个 "A_B" 格式的名字
			Name:    "Private Chat",
			Members: []*model.User{&user, &friend},
		}

		if err := tx.Create(&privateRoom).Error; err != nil {
			return err
		}

		if err := tx.Preload("Members").Preload("Admins").Preload("CreatorList").First(&privateRoom, privateRoom.ID).Error; err != nil {
			return err
		}
		createdRoom = &privateRoom

		return nil
	})
	if err != nil {
		return nil, err
	}

	return createdRoom, nil
}

// DeleteFriend 删除好友 + 删除私聊房间
func (r *friendRepository) DeleteFriend(ctx context.Context, userId, friendId uint) error {
	return r.DB(ctx).Transaction(func(tx *gorm.DB) error {
		user := model.User{ID: userId}
		friend := model.User{ID: friendId}

		// 1. 查找只包含这两名用户的私聊房间。
		// 所有条件都使用占位符，并忽略已软删除的成员关系。
		var roomIDs []uint
		if err := tx.Model(&model.Room{}).
			Select("rooms.id").
			Joins("JOIN room_members AS user_membership ON user_membership.room_id = rooms.id AND user_membership.user_id = ? AND user_membership.deleted_at IS NULL", userId).
			Joins("JOIN room_members AS friend_membership ON friend_membership.room_id = rooms.id AND friend_membership.user_id = ? AND friend_membership.deleted_at IS NULL", friendId).
			Joins("JOIN room_members AS active_membership ON active_membership.room_id = rooms.id AND active_membership.deleted_at IS NULL").
			Where("rooms.channel_type = ?", model.RoomTypePrivate).
			Group("rooms.id").
			Having("COUNT(DISTINCT active_membership.user_id) = ?", 2).
			Pluck("rooms.id", &roomIDs).Error; err != nil {
			return err
		}

		// 2. 删除好友关系 (双向)
		if err := tx.Model(&user).Association("Friends").Delete(&friend); err != nil {
			return err
		}
		if err := tx.Model(&friend).Association("Friends").Delete(&user); err != nil {
			return err
		}

		// 3. 显式硬删除中间表记录，再软删除私聊房间。
		// GORM 默认不会在删除 many-to-many 主记录时清理中间表。
		if len(roomIDs) > 0 {
			if err := tx.Unscoped().Where("room_id IN ?", roomIDs).Delete(&model.RoomMember{}).Error; err != nil {
				return err
			}
			if err := tx.Where("id IN ?", roomIDs).Delete(&model.Room{}).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

// GetFriends 获取好友列表
// 这一步变得非常简单，不需要 Preload 复杂的嵌套结构
func (r *friendRepository) GetFriends(ctx context.Context, userId uint) ([]*model.User, error) {
	var user model.User
	// 只需要查找 User 并 preload Friends 关联即可，或者直接通过 Association 查找
	user.ID = userId

	var friends []*model.User
	// 查找该用户的 Friends 关联
	err := r.DB(ctx).Model(&user).Association("Friends").Find(&friends)
	if err != nil {
		return nil, err
	}

	return friends, nil
}

// IsFriend 检查是否是好友
func (r *friendRepository) IsFriend(ctx context.Context, userId, friendId uint) (bool, error) {
	user := model.User{ID: userId}
	// friend := model.User{ID: friendId}

	// 检查 user 的 Friends 列表中是否包含 friendId
	count := r.DB(ctx).Model(&user).Where("id = ?", friendId).Association("Friends").Count()

	return count > 0, nil
}
