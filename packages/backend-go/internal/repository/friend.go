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

const RoomTypePrivate = 1

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

		// 1. 删除好友关系 (双向)
		if err := tx.Model(&user).Association("Friends").Delete(&friend); err != nil {
			return err
		}
		if err := tx.Model(&friend).Association("Friends").Delete(&user); err != nil {
			return err
		}

		// 2. 查找这两个人共有的“私聊”房间 ID
		// 逻辑：在 room_members 表中，找到同时包含 userId 和 friendId，且对应的 Room 类型是 Private 的记录
		// 这是一个比较复杂的查询，用原生 SQL 或 Join 最稳妥
		var roomId uint

		// SQL思路:
		// 找到一个 room_id, 它关联了 user_id, 也关联了 friend_id, 并且该 room 的 type 是 1
		query := `
            SELECT r.id 
            FROM rooms r
            JOIN room_members rm1 ON r.id = rm1.room_id AND rm1.user_id = ?
            JOIN room_members rm2 ON r.id = rm2.room_id AND rm2.user_id = ?
            WHERE r.type = ?
            LIMIT 1
        `

		// 执行查询
		if err := tx.Raw(query, userId, friendId, RoomTypePrivate).Scan(&roomId).Error; err != nil {
			// 如果没找到房间，可能之前数据不一致，这里可以选择忽略错误，或者返回错误
			// 这里选择记录日志但不中断事务，或者直接 return nil 视为成功
			return nil
		}

		// 3. 删除房间
		if roomId > 0 {
			// 这里使用了 Unscoped() 硬删除，如果你想保留聊天记录(软删除)，去掉 Unscoped() 即可
			// 注意：删除 Room 时，GORM 会自动删除 room_members 中间表的记录（如果设置了级联），
			// 但 Gorm 默认 many2many 不会自动级联删除中间表数据，最好手动处理或确保数据库有外键级联约束。
			// 最简单的办法是 Select("Members").Delete... 但删除 Room 本身通常就够了

			// 先清空该房间的成员关联 (这一步在使用 many2many 时很重要，防止中间表残留)
			targetRoom := model.Room{Model: gorm.Model{ID: roomId}}
			if err := tx.Model(&targetRoom).Association("Members").Clear(); err != nil {
				return err
			}

			// 再删除房间本身
			if err := tx.Delete(&targetRoom).Error; err != nil {
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
