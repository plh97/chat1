package repository

import (
	v1 "backend-go/api/v1"
	"backend-go/internal/model"
	"context"
	"errors"
	"fmt"

	"gorm.io/gorm"
)

type UserRepository interface {
	Create(ctx context.Context, user *model.User) error
	Update(ctx context.Context, user *model.User) error
	UpdateFields(ctx context.Context, id int, fields map[string]interface{}) error
	GetByID(ctx context.Context, id int) (*model.User, error)
	GetByEmail(ctx context.Context, email string) (*model.User, error)
	List(ctx context.Context, req v1.ListUsersRequest) ([]model.User, error)
}

func NewUserRepository(r *Repository) UserRepository {
	return &userRepository{
		Repository: r,
	}
}

type userRepository struct {
	*Repository
}

func (r *userRepository) Create(ctx context.Context, user *model.User) error {
	if err := r.DB(ctx).Create(user).Error; err != nil {
		return err
	}
	return nil
}

func (r *userRepository) Update(ctx context.Context, user *model.User) error {
	if err := r.DB(ctx).Where("id = ?", user.ID).Updates(user).Error; err != nil {
		return err
	}
	return nil
}

func (r *userRepository) UpdateFields(ctx context.Context, id int, fields map[string]interface{}) error {
	if err := r.DB(ctx).Model(&model.User{}).Where("id = ?", id).Updates(fields).Error; err != nil {
		return err
	}
	return nil
}

func (r *userRepository) GetByID(ctx context.Context, id int) (*model.User, error) {
	var user model.User
	// if private room, should preload rooms' member
	if err := r.DB(ctx).Where("id = ?", id).Preload("Rooms").
		// Preload("Rooms.Members", "channel_type = ?", model.RoomTypePrivate).
		// 2. 加载房间成员，但增加一个过滤条件：只加载那些 "所属房间是私聊" 的成员
		Preload("Rooms.Members", func(db *gorm.DB) *gorm.DB {
			// 这里是重点：
			return db.Joins("JOIN room_members AS rm ON rm.user_id = users.id").
				Joins("JOIN rooms AS r ON r.id = rm.room_id").
				Where("r.channel_type = ?", model.RoomTypePrivate)
		}).
		First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, v1.ErrNotFound
		}
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	var user model.User
	if err := r.DB(ctx).Where("email = ?", email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) List(ctx context.Context, req v1.ListUsersRequest) ([]model.User, error) {
	var users []model.User
	query := r.DB(ctx)
	fmt.Println("Applying filters:", req.UserName)
	// Filter by ID (exact match)
	if id := req.ID; id != 0 {
		query = query.Where("id = ?", id)
	}

	// Filter by username (partial match with LIKE)
	if username := req.UserName; username != "" {
		query = query.Where("username LIKE ?", "%"+username+"%")
	}

	// Filter by email (partial match with LIKE)
	if email := req.Email; email != "" {
		query = query.Where("email LIKE ?", "%"+email+"%")
	}

	// Execute the query
	if err := query.Find(&users).Error; err != nil {
		return nil, err
	}

	return users, nil
}
