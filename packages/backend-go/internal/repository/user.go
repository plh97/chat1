package repository

import (
	v1 "backend-go/api/v1"
	"backend-go/internal/model"
	"context"
	"errors"

	"gorm.io/gorm"
)

type UserRepository interface {
	Create(ctx context.Context, user *model.User) error
	Update(ctx context.Context, user *model.User) error
	UpdateFields(ctx context.Context, id int, fields map[string]interface{}) error
	GetByID(ctx context.Context, id int) (*model.User, error)
	GetProfileByID(ctx context.Context, id int) (*model.User, error)
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

type privateRoomPeerRow struct {
	RoomID   uint   `gorm:"column:room_id"`
	UserID   uint   `gorm:"column:user_id"`
	UserName string `gorm:"column:user_name"`
	Image    string `gorm:"column:image"`
}

func (r *userRepository) loadPrivateRoomPeers(ctx context.Context, user *model.User) error {
	privateRoomIDs := make([]uint, 0)
	for _, room := range user.Rooms {
		if room.ChannelType == model.RoomTypePrivate {
			privateRoomIDs = append(privateRoomIDs, room.ID)
		}
	}
	if len(privateRoomIDs) == 0 {
		return nil
	}

	var rows []privateRoomPeerRow
	err := r.DB(ctx).
		Table("room_members").
		Select("room_members.room_id AS room_id, users.id AS user_id, users.username AS user_name, users.image AS image").
		Joins("JOIN users ON users.id = room_members.user_id").
		Where("room_members.room_id IN ?", privateRoomIDs).
		Where("room_members.user_id <> ?", user.ID).
		Where("room_members.deleted_at IS NULL AND users.deleted_at IS NULL").
		Order("room_members.room_id ASC, users.id ASC").
		Scan(&rows).Error
	if err != nil {
		return err
	}

	peersByRoom := make(map[uint]*model.User, len(rows))
	for _, row := range rows {
		if _, exists := peersByRoom[row.RoomID]; exists {
			continue
		}
		peersByRoom[row.RoomID] = &model.User{
			ID:       row.UserID,
			UserName: row.UserName,
			Image:    row.Image,
		}
	}
	for index := range user.Rooms {
		user.Rooms[index].Peer = peersByRoom[user.Rooms[index].ID]
	}

	return nil
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
	if err := r.DB(ctx).Where("id = ?", id).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, v1.ErrNotFound
		}
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) GetProfileByID(ctx context.Context, id int) (*model.User, error) {
	var user model.User
	if err := r.DB(ctx).Where("id = ?", id).
		Preload("Rooms", func(db *gorm.DB) *gorm.DB {
			return db.Select("rooms.id", "rooms.created_at", "rooms.updated_at", "rooms.deleted_at", "rooms.name", "rooms.image", "rooms.channel_type", "rooms.read_seq")
		}).
		First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, v1.ErrNotFound
		}
		return nil, err
	}
	if err := r.loadPrivateRoomPeers(ctx, &user); err != nil {
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

	if req.ChannelID != "" {
		query = query.Joins("JOIN room_members ON room_members.user_id = users.id").
			Where("room_members.room_id = ?", req.ChannelID)
		if req.Role == model.Admin || req.Role == model.Member || req.Role == model.Creator {
			query = query.Where("room_members.role = ?", req.Role)
		}
	}

	query = query.Order("users.id ASC")
	if req.Start > 0 {
		query = query.Offset(req.Start)
	}
	if req.PageSize > 0 {
		query = query.Limit(req.PageSize)
	}

	// Execute the query
	if err := query.Find(&users).Error; err != nil {
		return nil, err
	}

	return users, nil
}
