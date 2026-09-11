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

func loadTenantFriendPair(db *gorm.DB, tenantID, userID, friendID uint) (*model.User, *model.User, uint, error) {
	var users []model.User
	query := db.Where("id IN ?", []uint{userID, friendID})
	if tenantID != 0 {
		query = query.Where("tenant_id = ?", tenantID)
	}
	if err := query.Find(&users).Error; err != nil {
		return nil, nil, 0, err
	}
	if len(users) != 2 {
		return nil, nil, 0, gorm.ErrRecordNotFound
	}

	var user, friend *model.User
	for index := range users {
		switch users[index].ID {
		case userID:
			user = &users[index]
		case friendID:
			friend = &users[index]
		}
	}
	if user == nil || friend == nil {
		return nil, nil, 0, gorm.ErrRecordNotFound
	}
	if tenantID == 0 {
		tenantID = user.TenantID
	}
	if tenantID == 0 || user.TenantID != tenantID || friend.TenantID != tenantID {
		return nil, nil, 0, gorm.ErrRecordNotFound
	}
	return user, friend, tenantID, nil
}

// AddFriend 添加好友 + 创建私聊房间
func (r *friendRepository) AddFriend(ctx context.Context, userId, friendId uint) (*model.Room, error) {
	if userId == friendId {
		return nil, errors.New("cannot add self as friend")
	}

	isFriend, err := r.IsFriend(ctx, userId, friendId)
	if err != nil {
		return nil, err
	}
	if isFriend {
		return nil, errors.New("already friends")
	}

	var createdRoom *model.Room
	tenantID := TenantIDFromContext(ctx)

	err = r.DB(ctx).Transaction(func(tx *gorm.DB) error {
		user, friend, scopedTenantID, err := loadTenantFriendPair(tx, tenantID, userId, friendId)
		if err != nil {
			return err
		}

		// 1. 建立好友关系 (双向)
		if err := tx.Model(user).Association("Friends").Append(friend); err != nil {
			return err
		}
		if err := tx.Model(friend).Association("Friends").Append(user); err != nil {
			return err
		}

		// 2. 创建私聊房间 (Room)
		privateRoom := model.Room{
			TenantID:    scopedTenantID,
			ChannelType: model.RoomTypePrivate,
			Name:        "Private Chat",
		}

		if err := tx.Create(&privateRoom).Error; err != nil {
			return err
		}
		memberships := []model.RoomMember{
			{RoomID: privateRoom.ID, UserID: user.ID, Role: model.Member},
			{RoomID: privateRoom.ID, UserID: friend.ID, Role: model.Member},
		}
		if err := tx.Create(&memberships).Error; err != nil {
			return err
		}

		if err := tx.Preload("Members").Preload("Admins").Preload("CreatorList").
			Where("id = ? AND tenant_id = ?", privateRoom.ID, scopedTenantID).
			First(&privateRoom).Error; err != nil {
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
	if userId == friendId {
		return errors.New("cannot delete self as friend")
	}
	tenantID := TenantIDFromContext(ctx)
	return r.DB(ctx).Transaction(func(tx *gorm.DB) error {
		user, friend, scopedTenantID, err := loadTenantFriendPair(tx, tenantID, userId, friendId)
		if err != nil {
			return err
		}

		// 1. 查找只包含这两名用户的私聊房间。
		// 所有条件都使用占位符，并忽略已软删除的成员关系。
		var roomIDs []uint
		if err := tx.Model(&model.Room{}).
			Select("rooms.id").
			Joins("JOIN room_members AS user_membership ON user_membership.room_id = rooms.id AND user_membership.user_id = ? AND user_membership.deleted_at IS NULL", userId).
			Joins("JOIN room_members AS friend_membership ON friend_membership.room_id = rooms.id AND friend_membership.user_id = ? AND friend_membership.deleted_at IS NULL", friendId).
			Joins("JOIN room_members AS active_membership ON active_membership.room_id = rooms.id AND active_membership.deleted_at IS NULL").
			Where("rooms.channel_type = ? AND rooms.tenant_id = ?", model.RoomTypePrivate, scopedTenantID).
			Group("rooms.id").
			Having("COUNT(DISTINCT active_membership.user_id) = ?", 2).
			Pluck("rooms.id", &roomIDs).Error; err != nil {
			return err
		}

		// 2. 删除好友关系 (双向)
		if err := tx.Model(user).Association("Friends").Delete(friend); err != nil {
			return err
		}
		if err := tx.Model(friend).Association("Friends").Delete(user); err != nil {
			return err
		}

		// 3. 显式硬删除中间表记录，再软删除私聊房间。
		// GORM 默认不会在删除 many-to-many 主记录时清理中间表。
		if len(roomIDs) > 0 {
			if err := tx.Unscoped().Where("room_id IN ?", roomIDs).Delete(&model.RoomMember{}).Error; err != nil {
				return err
			}
			if err := tx.Where("id IN ? AND tenant_id = ?", roomIDs, scopedTenantID).Delete(&model.Room{}).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

// GetFriends 获取好友列表
// 这一步变得非常简单，不需要 Preload 复杂的嵌套结构
func (r *friendRepository) GetFriends(ctx context.Context, userId uint) ([]*model.User, error) {
	var friends []*model.User
	query := r.DB(ctx).
		Table("users AS friends").
		Select("friends.*").
		Joins("JOIN user_friends ON user_friends.friend_id = friends.id").
		Joins("JOIN users AS owners ON owners.id = user_friends.user_id").
		Where("user_friends.user_id = ?", userId).
		Where("friends.deleted_at IS NULL AND owners.deleted_at IS NULL")
	if tenantID := TenantIDFromContext(ctx); tenantID != 0 {
		query = query.Where("friends.tenant_id = ? AND owners.tenant_id = ?", tenantID, tenantID)
	}
	if err := query.Order("friends.id ASC").Find(&friends).Error; err != nil {
		return nil, err
	}

	return friends, nil
}

// IsFriend 检查是否是好友
func (r *friendRepository) IsFriend(ctx context.Context, userId, friendId uint) (bool, error) {
	var count int64
	query := r.DB(ctx).
		Table("user_friends").
		Joins("JOIN users AS owners ON owners.id = user_friends.user_id AND owners.deleted_at IS NULL").
		Joins("JOIN users AS friends ON friends.id = user_friends.friend_id AND friends.deleted_at IS NULL").
		Where("user_friends.user_id = ? AND user_friends.friend_id = ?", userId, friendId)
	if tenantID := TenantIDFromContext(ctx); tenantID != 0 {
		query = query.Where("owners.tenant_id = ? AND friends.tenant_id = ?", tenantID, tenantID)
	}
	if err := query.Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}
