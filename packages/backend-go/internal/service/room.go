package service

import (
	"backend-go/internal/model"
	"backend-go/internal/repository"
	"context"
	"errors"

	v1 "backend-go/api/v1"
	"gorm.io/gorm"
)

type RoomService interface {
	CreateRoom(ctx context.Context, req v1.RoomCreateRequest) (interface{}, error)
	GetRoomByID(ctx context.Context, id uint) (interface{}, error)
	ListRooms(ctx context.Context) (interface{}, error)
	UpdateRoom(ctx context.Context, req v1.RoomUpdateRequest) (interface{}, error)
	JoinRoom(ctx context.Context, userID, roomID uint) (interface{}, error)
	DeleteRoom(ctx context.Context, id uint) error
}

func NewRoomService(service *Service) RoomService {
	return &roomService{
		Service: service,
	}
}

type roomService struct {
	*Service
}

func uniqueUintIDs(ids []uint, excluded ...uint) []uint {
	excludedSet := make(map[uint]struct{}, len(excluded))
	for _, id := range excluded {
		excludedSet[id] = struct{}{}
	}

	unique := make([]uint, 0, len(ids))
	seen := make(map[uint]struct{}, len(ids))
	for _, id := range ids {
		if id == 0 {
			continue
		}
		if _, skip := excludedSet[id]; skip {
			continue
		}
		if _, exists := seen[id]; exists {
			continue
		}
		seen[id] = struct{}{}
		unique = append(unique, id)
	}

	return unique
}

func upsertRoomMember(db *gorm.DB, roomID, userID uint, role string) error {
	var roomMember model.RoomMember
	err := db.Where("room_id = ? AND user_id = ?", roomID, userID).First(&roomMember).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return db.Create(&model.RoomMember{
				RoomID: roomID,
				UserID: userID,
				Role:   role,
			}).Error
		}
		return err
	}

	if roomMember.Role == role {
		return nil
	}

	return db.Model(&roomMember).Update("role", role).Error
}

// 假设房间表名为 rooms，字段有 id, name, created_at, updated_at
// type Room struct {
// 	model.Room
// 	// ID        string `gorm:"primaryKey" json:"id"`
// 	// Name      string `json:"name"`
// 	// CreatedAt int64  `json:"created_at"`
// 	// UpdatedAt int64  `json:"updated_at"`
// }

func (s *roomService) CreateRoom(ctx context.Context, req v1.RoomCreateRequest) (interface{}, error) {
	db := s.tm.(*repository.Repository).DB(ctx)

	// 1. 创建房间
	room := &model.Room{
		Name: req.Name,
		Image: req.Image,
	}
	if err := db.Create(room).Error; err != nil {
		return nil, err
	}

	// 2. 添加创建者为成员（可选，如果创建者也应该在成员列表中）
	if err := db.Create(&model.RoomMember{
		RoomID: room.ID,
		UserID: req.CreatorID,
		Role:   model.Creator,
	}).Error; err != nil {
		return nil, err
	}

	// 3. 添加管理员
	adminIDs := uniqueUintIDs(req.GetAdminIDs(), req.CreatorID)
	for _, adminID := range adminIDs {
		if err := upsertRoomMember(db, room.ID, adminID, model.Admin); err != nil {
			return nil, err
		}
	}

	// 4. 添加普通成员
	memberIDs := uniqueUintIDs(req.GetMemberIDs(), req.CreatorID)
	for _, memberID := range memberIDs {
		if err := upsertRoomMember(db, room.ID, memberID, model.Member); err != nil {
			return nil, err
		}
	}

	return s.GetRoomByID(ctx, room.ID)
}

func (s *roomService) GetRoomByID(ctx context.Context, id uint) (interface{}, error) {
	db := s.tm.(*repository.Repository).DB(ctx)
	var room model.Room
	if err := db.
		Preload("Members").
		Preload("Admins").
		Preload("CreatorList").
		Where("id = ?", id).
		First(&room).Error; err != nil {
		return nil, err
	}
	return room, nil
}

func (s *roomService) ListRooms(ctx context.Context) (interface{}, error) {
	db := s.tm.(*repository.Repository).DB(ctx)
	var rooms []model.Room
	if err := db.
		Preload("Members").
		Preload("Admins").
		Preload("Creator").
		Find(&rooms).Error; err != nil {
		return nil, err
	}
	return rooms, nil
}

func (s *roomService) UpdateRoom(ctx context.Context, req v1.RoomUpdateRequest) (interface{}, error) {
	db := s.tm.(*repository.Repository).DB(ctx)
	var room model.Room
	if err := db.Where("id = ?", req.ID).First(&room).Error; err != nil {
		return nil, err
	}

	updates := map[string]interface{}{}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Image != "" {
		updates["image"] = req.Image
	}
	if len(updates) > 0 {
		if err := db.Model(&room).Updates(updates).Error; err != nil {
			return nil, err
		}
	}

	adminIDs := uniqueUintIDs(req.GetAdminIDs(), req.CreatorID)
	for _, adminID := range adminIDs {
		if err := upsertRoomMember(db, room.ID, adminID, model.Admin); err != nil {
			return nil, err
		}
	}

	memberIDs := uniqueUintIDs(req.GetMemberIDs(), req.CreatorID)
	for _, memberID := range memberIDs {
		if err := upsertRoomMember(db, room.ID, memberID, model.Member); err != nil {
			return nil, err
		}
	}

	return s.GetRoomByID(ctx, room.ID)
}

func (s *roomService) JoinRoom(ctx context.Context, userID, roomID uint) (interface{}, error) {
	db := s.tm.(*repository.Repository).DB(ctx)
	var room model.Room
	query := db.Model(&model.Room{})
	if roomID == 0 {
		if err := query.Order("id ASC").First(&room).Error; err != nil {
			return nil, err
		}
	} else {
		if err := query.Where("id = ?", roomID).First(&room).Error; err != nil {
			return nil, err
		}
	}

	if err := upsertRoomMember(db, room.ID, userID, model.Member); err != nil {
		return nil, err
	}

	return s.GetRoomByID(ctx, room.ID)
}

func (s *roomService) DeleteRoom(ctx context.Context, id uint) error {
	db := s.tm.(*repository.Repository).DB(ctx)
	if err := db.Where("room_id = ?", id).Delete(&model.RoomMember{}).Error; err != nil {
		return err
	}
	return db.Delete(&model.Room{}, id).Error
}
