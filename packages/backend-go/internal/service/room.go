package service

import (
	"backend-go/internal/model"
	"backend-go/internal/repository"
	"context"

	v1 "backend-go/api/v1"
)

type RoomService interface {
	CreateRoom(ctx context.Context, req v1.RoomCreateRequest) (interface{}, error)
	GetRoomByID(ctx context.Context, id uint) (interface{}, error)
	ListRooms(ctx context.Context) (interface{}, error)
	UpdateRoom(ctx context.Context, req v1.RoomUpdateRequest) (interface{}, error)
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
	for _, adminID := range req.AdminIDs {
		if err := db.Create(&model.RoomMember{
			RoomID: room.ID,
			UserID: adminID,
			Role:   model.Admin,
		}).Error; err != nil {
			return nil, err
		}
	}

	// 4. 添加普通成员
	for _, memberID := range req.MemberIDs {
		if err := db.Create(&model.RoomMember{
			RoomID: room.ID,
			UserID: memberID,
			Role:   model.Member,
		}).Error; err != nil {
			return nil, err
		}
	}

	return room, nil
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

	// 1. 更新房间基本信息
	room.Name = req.Name
	if err := db.Save(&room).Error; err != nil {
		return nil, err
	}

	// 2. 删除旧的成员关系（除了创建者）
	if err := db.Where("room_id = ? AND role != ?", room.ID, "creator").Delete(&model.RoomMember{}).Error; err != nil {
		return nil, err
	}

	// 3. 重新添加管理员
	for _, adminID := range req.AdminIDs {
		if err := db.Create(&model.RoomMember{
			RoomID: room.ID,
			UserID: adminID,
			Role:   "admin",
		}).Error; err != nil {
			return nil, err
		}
	}

	// 4. 重新添加普通成员
	for _, memberID := range req.MemberIDs {
		if err := db.Create(&model.RoomMember{
			RoomID: room.ID,
			UserID: memberID,
			Role:   "member",
		}).Error; err != nil {
			return nil, err
		}
	}

	return room, nil
}

func (s *roomService) DeleteRoom(ctx context.Context, id uint) error {
	db := s.tm.(*repository.Repository).DB(ctx)
	return db.Delete(&model.Room{}, id).Error
}
