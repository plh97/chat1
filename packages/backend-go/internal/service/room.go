package service

import (
	"backend-go/internal/model"
	"backend-go/internal/repository"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"

	v1 "backend-go/api/v1"

	"gorm.io/gorm"
)

type RoomService interface {
	CreateRoom(ctx context.Context, req v1.RoomCreateRequest) (interface{}, error)
	GetRoomByID(ctx context.Context, id, viewerID uint, memberLimit, memberOffset, adminLimit, adminOffset int) (interface{}, error)
	GetRoomMessages(ctx context.Context, roomID uint, limit, offset int) (interface{}, error)
	GetRoomUsers(ctx context.Context, roomID, viewerID uint, role string, limit, offset int) (interface{}, error)
	GetRoomMessageWindow(ctx context.Context, roomID, messageID uint, limit int) (interface{}, error)
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
	ID               uint                   `json:"id"`
	Name             string                 `json:"name"`
	Image            string                 `json:"image"`
	ChannelType      string                 `json:"channelType"`
	IsMember         bool                   `json:"isMember"`
	ReadSeq          interface{}            `json:"readSeq"`
	Member           []*model.User          `json:"member"`
	MemberTotalCount int64                  `json:"memberTotalCount"`
	Admin            []*model.User          `json:"admin"`
	AdminTotalCount  int64                  `json:"adminTotalCount"`
	Creator          *model.User            `json:"creator"`
	Message          []*roomMessageResponse `json:"message"`
	TotalCount       int64                  `json:"totalCount"`
	CreatedAt        interface{}            `json:"createdAt"`
	UpdatedAt        interface{}            `json:"updatedAt"`
}

type roomMemberPageResponse struct {
	Role       string        `json:"role"`
	Users      []*model.User `json:"users"`
	TotalCount int64         `json:"totalCount"`
}

type roomMessagePageResponse struct {
	Message []*roomMessageResponse `json:"message"`
	HasMore bool                   `json:"hasMore"`
}

type roomMessageWindowResponse struct {
	Message     []*roomMessageResponse `json:"message"`
	TargetID    uint                   `json:"targetId"`
	TargetIndex int64                  `json:"targetIndex"`
	TotalCount  int64                  `json:"totalCount"`
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
		UserID: req.GetCreatorID(),
		Role:   model.Creator,
	}).Error; err != nil {
		return nil, err
	}

	// 3. 添加管理员
	adminIDs := uniqueUintIDs(req.GetAdminIDs(), req.GetCreatorID())
	for _, adminID := range adminIDs {
		if err := upsertRoomMember(db, room.ID, adminID, model.Admin); err != nil {
			return nil, err
		}
	}

	// 4. 添加普通成员
	memberIDs := uniqueUintIDs(req.GetMemberIDs(), req.GetCreatorID())
	for _, memberID := range memberIDs {
		if err := upsertRoomMember(db, room.ID, memberID, model.Member); err != nil {
			return nil, err
		}
	}

	return s.GetRoomByID(ctx, room.ID, req.GetCreatorID(), 20, 0, 20, 0)
}

func (s *roomService) GetRoomByID(ctx context.Context, id, viewerID uint, memberLimit, memberOffset, adminLimit, adminOffset int) (interface{}, error) {
	db := s.tm.(*repository.Repository).DB(ctx)
	room, err := loadRoomForMessages(db, id)
	if err != nil {
		return nil, err
	}
	if memberLimit <= 0 {
		memberLimit = 0
	}
	if memberOffset < 0 {
		memberOffset = 0
	}
	if adminLimit <= 0 {
		adminLimit = 0
	}
	if adminOffset < 0 {
		adminOffset = 0
	}

	members, memberTotalCount, err := loadRoomUsersByRole(db, id, viewerID, model.Member, memberLimit, memberOffset)
	if err != nil {
		return nil, err
	}
	room.Members = members
	admins, adminTotalCount, err := loadRoomUsersByRole(db, id, viewerID, model.Admin, adminLimit, adminOffset)
	if err != nil {
		return nil, err
	}
	room.Admins = admins
	viewerRole, err := getViewerRole(db, id, viewerID)
	if err != nil {
		return nil, err
	}

	return &roomDetailResponse{
		ID:               room.ID,
		Name:             room.Name,
		Image:            room.Image,
		ChannelType:      room.ChannelType,
		IsMember:         viewerRole != "",
		ReadSeq:          room.ReadSeq,
		Member:           room.Members,
		MemberTotalCount: memberTotalCount,
		Admin:            room.Admins,
		AdminTotalCount:  adminTotalCount,
		Creator:          room.Creator,
		Message:          []*roomMessageResponse{},
		TotalCount:       0,
		CreatedAt:        room.CreatedAt,
		UpdatedAt:        room.UpdatedAt,
	}, nil
}

func (s *roomService) GetRoomMessages(ctx context.Context, roomID uint, limit, offset int) (interface{}, error) {
	db := s.tm.(*repository.Repository).DB(ctx)
	room, err := loadRoomForMessages(db, roomID)
	if err != nil {
		return nil, err
	}
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	channelID := strconv.Itoa(int(room.ID))
	var messages []model.Message
	if err := db.Where("channel_id = ?", channelID).
		Order("seq DESC").
		Limit(limit + 1).
		Offset(offset).
		Find(&messages).Error; err != nil {
		return nil, err
	}

	hasMore := len(messages) > limit
	if hasMore {
		messages = messages[:limit]
	}

	for left, right := 0, len(messages)-1; left < right; left, right = left+1, right-1 {
		messages[left], messages[right] = messages[right], messages[left]
	}

	replyMessagesByID, err := loadReplyMessages(db, messages)
	if err != nil {
		return nil, err
	}
	userMap, err := buildMessageUserMap(db, room, messages, replyMessagesByID)
	if err != nil {
		return nil, err
	}

	responseMessages := make([]*roomMessageResponse, 0, len(messages))
	for _, message := range messages {
		responseMessages = append(responseMessages, buildRoomMessageResponse(message, userMap[message.UserId], userMap, replyMessagesByID))
	}

	return &roomMessagePageResponse{
		Message: responseMessages,
		HasMore: hasMore,
	}, nil
}

func (s *roomService) GetRoomUsers(ctx context.Context, roomID, viewerID uint, role string, limit, offset int) (interface{}, error) {
	db := s.tm.(*repository.Repository).DB(ctx)
	if role != model.Admin {
		role = model.Member
	}
	users, totalCount, err := loadRoomUsersByRole(db, roomID, viewerID, role, limit, offset)
	if err != nil {
		return nil, err
	}

	return &roomMemberPageResponse{
		Role:       role,
		Users:      users,
		TotalCount: totalCount,
	}, nil
}

func (s *roomService) GetRoomMessageWindow(ctx context.Context, roomID, messageID uint, limit int) (interface{}, error) {
	db := s.tm.(*repository.Repository).DB(ctx)
	room, err := loadRoomForMessages(db, roomID)
	if err != nil {
		return nil, err
	}
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}

	channelID := strconv.Itoa(int(room.ID))
	var targetMessage model.Message
	if err := db.Where("id = ? AND channel_id = ?", messageID, channelID).First(&targetMessage).Error; err != nil {
		return nil, err
	}

	var totalCount int64
	if err := db.Model(&model.Message{}).Where("channel_id = ?", channelID).Count(&totalCount).Error; err != nil {
		return nil, err
	}

	var targetIndex int64
	if err := db.Model(&model.Message{}).Where("channel_id = ? AND seq < ?", channelID, targetMessage.Seq).Count(&targetIndex).Error; err != nil {
		return nil, err
	}

	start := int(targetIndex) - limit/2
	if start < 0 {
		start = 0
	}
	if totalCount > int64(limit) && int64(start+limit) > totalCount {
		start = int(totalCount) - limit
		if start < 0 {
			start = 0
		}
	}

	var messages []model.Message
	if err := db.Where("channel_id = ?", channelID).
		Order("seq ASC").
		Limit(limit).
		Offset(start).
		Find(&messages).Error; err != nil {
		return nil, err
	}

	replyMessagesByID, err := loadReplyMessages(db, messages)
	if err != nil {
		return nil, err
	}
	userMap, err := buildMessageUserMap(db, room, messages, replyMessagesByID)
	if err != nil {
		return nil, err
	}
	responseMessages := make([]*roomMessageResponse, 0, len(messages))
	for i := range messages {
		message := messages[i]
		user := userMap[message.UserId]
		responseMessages = append(responseMessages, buildRoomMessageResponse(message, user, userMap, replyMessagesByID))
	}

	return &roomMessageWindowResponse{
		Message:     responseMessages,
		TargetID:    targetMessage.ID,
		TargetIndex: targetIndex,
		TotalCount:  totalCount,
	}, nil
}

func loadRoomForMessages(db *gorm.DB, id uint) (*model.Room, error) {
	var room model.Room
	if err := db.
		Preload("CreatorList").
		Where("id = ?", id).
		First(&room).Error; err != nil {
		return nil, err
	}
	return &room, nil
}

func loadRoomUsersByRole(db *gorm.DB, roomID, viewerID uint, role string, limit, offset int) ([]*model.User, int64, error) {
	if offset < 0 {
		offset = 0
	}

	memberQuery := db.Model(&model.User{}).
		Joins("JOIN room_members ON room_members.user_id = users.id").
		Where("room_members.room_id = ? AND room_members.role = ?", roomID, role)

	var memberTotalCount int64
	if err := memberQuery.Count(&memberTotalCount).Error; err != nil {
		return nil, 0, err
	}

	query := memberQuery
	if limit <= 0 {
		return []*model.User{}, memberTotalCount, nil
	}
	if viewerID != 0 {
		query = query.Order(fmt.Sprintf("CASE WHEN users.id = %d THEN 0 ELSE 1 END", viewerID))
	}
	query = query.Order("users.id ASC")

	var members []*model.User
	if err := query.Offset(offset).Limit(limit).Find(&members).Error; err != nil {
		return nil, 0, err
	}

	return members, memberTotalCount, nil
}

func getViewerRole(db *gorm.DB, roomID, viewerID uint) (string, error) {
	if viewerID == 0 {
		return "", nil
	}
	var roomMember model.RoomMember
	err := db.Select("role").Where("room_id = ? AND user_id = ?", roomID, viewerID).First(&roomMember).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return roomMember.Role, nil
}

func buildRoomMessageUserMap(room *model.Room) map[string]*roomMessageUser {
	userMap := map[string]*roomMessageUser{}
	if room == nil {
		return userMap
	}
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
	return userMap
}

func buildMessageUserMap(db *gorm.DB, room *model.Room, messages []model.Message, replyMessagesByID map[string]model.Message) (map[string]*roomMessageUser, error) {
	userMap := buildRoomMessageUserMap(room)
	userIDs := make(map[uint]struct{})
	collectUserID := func(rawUserID string) {
		if rawUserID == "" {
			return
		}
		if _, exists := userMap[rawUserID]; exists {
			return
		}
		parsedUserID, err := strconv.ParseUint(rawUserID, 10, 64)
		if err != nil {
			return
		}
		userIDs[uint(parsedUserID)] = struct{}{}
	}
	for _, message := range messages {
		collectUserID(message.UserId)
	}
	for _, replyMessage := range replyMessagesByID {
		collectUserID(replyMessage.UserId)
	}
	if len(userIDs) == 0 {
		return userMap, nil
	}
	ids := make([]uint, 0, len(userIDs))
	for id := range userIDs {
		ids = append(ids, id)
	}
	var users []model.User
	if err := db.Where("id IN ?", ids).Find(&users).Error; err != nil {
		return nil, err
	}
	for i := range users {
		user := users[i]
		userMap[strconv.Itoa(int(user.ID))] = buildRoomMessageUser(&user)
	}
	return userMap, nil
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
	if err := db.Where("id = ?", req.GetID()).First(&room).Error; err != nil {
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

	adminIDs := uniqueUintIDs(req.GetAdminIDs(), req.GetCreatorID())
	for _, adminID := range adminIDs {
		if err := upsertRoomMember(db, room.ID, adminID, model.Admin); err != nil {
			return nil, err
		}
	}

	memberIDs := uniqueUintIDs(req.GetMemberIDs(), req.GetCreatorID())
	for _, memberID := range memberIDs {
		if err := upsertRoomMember(db, room.ID, memberID, model.Member); err != nil {
			return nil, err
		}
	}

	return s.GetRoomByID(ctx, room.ID, 0, 20, 0, 20, 0)
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

	return s.GetRoomByID(ctx, room.ID, userID, 20, 0, 20, 0)
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
