package service

import (
	"backend-go/internal/model"
	"backend-go/internal/repository"
	"context"
	"encoding/json"
	"errors"
	"strconv"

	v1 "backend-go/api/v1"

	"gorm.io/gorm"
)

type RoomService interface {
	CreateRoom(ctx context.Context, req v1.RoomCreateRequest) (interface{}, error)
	GetRoomByID(ctx context.Context, id uint, limit, offset int) (interface{}, error)
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

type roomMessageUser struct {
	ID         uint   `json:"id"`
	UserID     string `json:"userId"`
	UserName   string `json:"userName"`
	Image      string `json:"image"`
	Email      string `json:"email,omitempty"`
	Bio        string `json:"bio,omitempty"`
	QQ         string `json:"qq,omitempty"`
	WeChat     string `json:"wechat,omitempty"`
	Github     string `json:"github,omitempty"`
	Permission string `json:"permission,omitempty"`
}

type roomMessageResponse struct {
	ID            uint                 `json:"id"`
	CreatedAt     interface{}          `json:"createdAt"`
	UpdatedAt     interface{}          `json:"updatedAt"`
	Seq           int                  `json:"seq"`
	ContentType   string               `json:"contentType"`
	ChannelID     string               `json:"channelId"`
	TextMessage   interface{}          `json:"textMessage,omitempty"`
	MediaMessage  interface{}          `json:"mediaMessage,omitempty"`
	ReadMessage   interface{}          `json:"readMessage,omitempty"`
	RecallMessage interface{}          `json:"recallMessage,omitempty"`
	SystemMessage interface{}          `json:"systemMessage,omitempty"`
	UserID        string               `json:"userId"`
	RoomID        string               `json:"roomId,omitempty"`
	ReplyID       string               `json:"replyId,omitempty"`
	Reply         *roomMessageResponse `json:"reply,omitempty"`
	IsRecalled    bool                 `json:"isRecalled"`
	User          *roomMessageUser     `json:"user,omitempty"`
}

type roomDetailResponse struct {
	ID          uint                   `json:"id"`
	Name        string                 `json:"name"`
	Image       string                 `json:"image"`
	ChannelType string                 `json:"channelType"`
	ReadSeq     interface{}            `json:"readSeq"`
	Member      []*model.User          `json:"member"`
	Admin       []*model.User          `json:"admin"`
	Creator     *model.User            `json:"creator"`
	Message     []*roomMessageResponse `json:"message"`
	TotalCount  int64                  `json:"totalCount"`
	CreatedAt   interface{}            `json:"createdAt"`
	UpdatedAt   interface{}            `json:"updatedAt"`
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
		Name:  req.Name,
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

	return s.GetRoomByID(ctx, room.ID, 50, 0)
}

func (s *roomService) GetRoomByID(ctx context.Context, id uint, limit, offset int) (interface{}, error) {
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

	if limit <= 0 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	channelID := strconv.Itoa(int(room.ID))
	var totalCount int64
	if err := db.Model(&model.Message{}).Where("channel_id = ?", channelID).Count(&totalCount).Error; err != nil {
		return nil, err
	}

	var messages []model.Message
	if err := db.Where("channel_id = ?", channelID).
		Order("seq ASC").
		Limit(limit).
		Offset(offset).
		Find(&messages).Error; err != nil {
		return nil, err
	}

	replyMessagesByID, err := loadReplyMessages(db, messages)
	if err != nil {
		return nil, err
	}

	userMap := map[string]*roomMessageUser{}
	for _, member := range room.Members {
		if member == nil {
			continue
		}
		userMap[strconv.Itoa(int(member.ID))] = buildRoomMessageUser(member)
	}
	for _, admin := range room.Admins {
		if admin == nil {
			continue
		}
		userMap[strconv.Itoa(int(admin.ID))] = buildRoomMessageUser(admin)
	}
	if room.Creator != nil {
		userMap[strconv.Itoa(int(room.Creator.ID))] = buildRoomMessageUser(room.Creator)
	}

	responseMessages := make([]*roomMessageResponse, 0, len(messages))
	for i := range messages {
		message := messages[i]
		user := userMap[message.UserId]
		if user == nil && message.UserId != "" {
			userID, parseErr := strconv.Atoi(message.UserId)
			if parseErr == nil {
				var dbUser model.User
				if err := db.Where("id = ?", userID).First(&dbUser).Error; err == nil {
					user = buildRoomMessageUser(&dbUser)
					userMap[message.UserId] = user
				}
			}
		}
		responseMessages = append(responseMessages, buildRoomMessageResponse(message, user, userMap, replyMessagesByID))
	}

	return &roomDetailResponse{
		ID:          room.ID,
		Name:        room.Name,
		Image:       room.Image,
		ChannelType: room.ChannelType,
		ReadSeq:     room.ReadSeq,
		Member:      room.Members,
		Admin:       room.Admins,
		Creator:     room.Creator,
		Message:     responseMessages,
		TotalCount:  totalCount,
		CreatedAt:   room.CreatedAt,
		UpdatedAt:   room.UpdatedAt,
	}, nil
}

func loadReplyMessages(db *gorm.DB, messages []model.Message) (map[string]model.Message, error) {
	replyIDs := make([]uint, 0)
	seen := map[uint]struct{}{}
	for _, message := range messages {
		if message.ReplyId == "" {
			continue
		}
		replyID, err := strconv.ParseUint(message.ReplyId, 10, 64)
		if err != nil {
			continue
		}
		if _, exists := seen[uint(replyID)]; exists {
			continue
		}
		seen[uint(replyID)] = struct{}{}
		replyIDs = append(replyIDs, uint(replyID))
	}
	if len(replyIDs) == 0 {
		return map[string]model.Message{}, nil
	}

	var replyMessages []model.Message
	if err := db.Where("id IN ?", replyIDs).Find(&replyMessages).Error; err != nil {
		return nil, err
	}

	replyMessagesByID := make(map[string]model.Message, len(replyMessages))
	for _, replyMessage := range replyMessages {
		replyMessagesByID[strconv.Itoa(int(replyMessage.ID))] = replyMessage
	}
	return replyMessagesByID, nil
}

func buildRoomMessageResponse(message model.Message, user *roomMessageUser, userMap map[string]*roomMessageUser, replyMessagesByID map[string]model.Message) *roomMessageResponse {
	response := &roomMessageResponse{
		ID:            message.ID,
		CreatedAt:     message.CreatedAt,
		UpdatedAt:     message.UpdatedAt,
		Seq:           message.Seq,
		ContentType:   message.ContentType,
		ChannelID:     message.ChannelId,
		TextMessage:   jsonStringToObject(message.TextMessage),
		MediaMessage:  jsonStringToObject(message.MediaMessage),
		ReadMessage:   jsonStringToObject(message.ReadMessage),
		RecallMessage: jsonStringToObject(message.RecallMessage),
		SystemMessage: jsonStringToObject(message.SystemMessage),
		UserID:        message.UserId,
		RoomID:        message.RoomId,
		ReplyID:       message.ReplyId,
		IsRecalled:    message.IsRecalled,
		User:          user,
	}

	if message.ReplyId == "" {
		return response
	}

	replyMessage, ok := replyMessagesByID[message.ReplyId]
	if !ok {
		return response
	}

	replyUser := userMap[replyMessage.UserId]
	response.Reply = &roomMessageResponse{
		ID:            replyMessage.ID,
		CreatedAt:     replyMessage.CreatedAt,
		UpdatedAt:     replyMessage.UpdatedAt,
		Seq:           replyMessage.Seq,
		ContentType:   replyMessage.ContentType,
		ChannelID:     replyMessage.ChannelId,
		TextMessage:   jsonStringToObject(replyMessage.TextMessage),
		MediaMessage:  jsonStringToObject(replyMessage.MediaMessage),
		ReadMessage:   jsonStringToObject(replyMessage.ReadMessage),
		RecallMessage: jsonStringToObject(replyMessage.RecallMessage),
		SystemMessage: jsonStringToObject(replyMessage.SystemMessage),
		UserID:        replyMessage.UserId,
		RoomID:        replyMessage.RoomId,
		ReplyID:       replyMessage.ReplyId,
		IsRecalled:    replyMessage.IsRecalled,
		User:          replyUser,
	}
	return response
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

	return s.GetRoomByID(ctx, room.ID, 50, 0)
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

	return s.GetRoomByID(ctx, room.ID, 50, 0)
}

func buildRoomMessageUser(user *model.User) *roomMessageUser {
	if user == nil {
		return nil
	}
	return &roomMessageUser{
		ID:         user.ID,
		UserID:     strconv.Itoa(int(user.ID)),
		UserName:   user.UserName,
		Image:      user.Image,
		Email:      user.Email,
		Bio:        user.Bio,
		QQ:         user.QQ,
		WeChat:     user.WeChat,
		Github:     user.Github,
		Permission: user.Permission,
	}
}

func jsonStringToObject(value string) interface{} {
	if value == "" || value == "null" {
		return nil
	}
	var object interface{}
	if err := json.Unmarshal([]byte(value), &object); err != nil {
		return nil
	}
	return object
}

func (s *roomService) DeleteRoom(ctx context.Context, id uint) error {
	db := s.tm.(*repository.Repository).DB(ctx)
	if err := db.Where("room_id = ?", id).Delete(&model.RoomMember{}).Error; err != nil {
		return err
	}
	return db.Delete(&model.Room{}, id).Error
}
