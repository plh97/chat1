package service

import (
	"backend-go/internal/model"
	"backend-go/internal/repository"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"

	v1 "backend-go/api/v1"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	ErrRoomForbidden     = errors.New("room operation forbidden")
	ErrInvalidRoomUpdate = errors.New("invalid room update")
)

// RoomUpdateResult keeps the HTTP response compatible while exposing the
// committed changes to event publishers. Every ID slice contains actual
// database changes, not merely IDs supplied by the caller.
type RoomUpdateResult struct {
	Room              interface{}
	AddedMemberIDs    []uint
	AddedAdminIDs     []uint
	RemovedMemberIDs  []uint
	RemovedAdminIDs   []uint
	PreviousCreatorID uint
	NewCreatorID      uint
	MetadataChanged   bool
	PreviousName      string
	NewName           string
	NameChanged       bool
	ImageChanged      bool
	RoomUserIDs       []uint
}

type RoomCreateResult struct {
	Room        interface{}
	RoomID      uint
	AdminIDs    []uint
	MemberIDs   []uint
	RoomUserIDs []uint
}

type RoomJoinResult struct {
	Room        interface{}
	RoomID      uint
	Added       bool
	RoomUserIDs []uint
}

type RoomDeleteResult struct {
	RoomUserIDs []uint
}

type RoomMessageRecallResult struct {
	Message  *model.Message
	Response interface{}
}

type RoomService interface {
	CreateRoom(ctx context.Context, req v1.RoomCreateRequest) (*RoomCreateResult, error)
	GetRoomByID(ctx context.Context, id, viewerID uint, memberLimit, memberOffset, adminLimit, adminOffset int) (interface{}, error)
	GetRoomMessages(ctx context.Context, roomID uint, limit, offset int) (interface{}, error)
	GetRoomMessagesByCursor(ctx context.Context, roomID uint, direction string, seq, limit int) (interface{}, error)
	SearchRoomMessages(ctx context.Context, roomID uint, query string, limit, offset int) (interface{}, error)
	GetRoomUsers(ctx context.Context, roomID, viewerID uint, role string, limit, offset int) (interface{}, error)
	GetMessageReaders(ctx context.Context, roomID, messageID uint, limit, offset int) (interface{}, error)
	GetRoomMessageWindow(ctx context.Context, roomID, messageID uint, limit int) (interface{}, error)
	AuthorizeRoomAccess(ctx context.Context, roomID, userID uint, allowPublic bool) error
	ListRooms(ctx context.Context, userID uint) (interface{}, error)
	UpdateRoom(ctx context.Context, operatorID uint, req v1.RoomUpdateRequest) (*RoomUpdateResult, error)
	JoinRoom(ctx context.Context, userID, roomID uint) (*RoomJoinResult, error)
	DeleteRoom(ctx context.Context, operatorID, id uint) (*RoomDeleteResult, error)
	RecallMessage(ctx context.Context, operatorID, roomID, messageID uint) (*RoomMessageRecallResult, error)
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
	ID                    uint                   `json:"id"`
	Name                  string                 `json:"name"`
	Image                 string                 `json:"image"`
	ChannelType           string                 `json:"channelType"`
	IsMember              bool                   `json:"isMember"`
	ReadSeq               interface{}            `json:"readSeq"`
	Member                []*model.User          `json:"member"`
	MemberTotalCount      int64                  `json:"memberTotalCount"`
	Admin                 []*model.User          `json:"admin"`
	AdminTotalCount       int64                  `json:"adminTotalCount"`
	ParticipantTotalCount int64                  `json:"participantTotalCount"`
	Creator               *model.User            `json:"creator"`
	Message               []*roomMessageResponse `json:"message"`
	TotalCount            int64                  `json:"totalCount"`
	CreatedAt             interface{}            `json:"createdAt"`
	UpdatedAt             interface{}            `json:"updatedAt"`
}

type roomMemberPageResponse struct {
	Role       string        `json:"role"`
	Users      []*model.User `json:"users"`
	TotalCount int64         `json:"totalCount"`
}

type messageReadersResponse struct {
	Users      []*roomMessageUser `json:"users"`
	TotalCount int64              `json:"totalCount"`
}

type roomMessagePageResponse struct {
	Message []*roomMessageResponse `json:"message"`
	HasMore bool                   `json:"hasMore"`
}

type roomMessageWindowResponse struct {
	Message       []*roomMessageResponse `json:"message"`
	TargetID      uint                   `json:"targetId"`
	TargetIndex   int64                  `json:"targetIndex"`
	TotalCount    int64                  `json:"totalCount"`
	HasMoreBefore bool                   `json:"hasMoreBefore"`
	HasMoreAfter  bool                   `json:"hasMoreAfter"`
}

type roomMessageSearchResponse struct {
	Message    []*roomMessageResponse `json:"message"`
	TotalCount int64                  `json:"totalCount"`
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
	err := db.Unscoped().
		Where("room_id = ? AND user_id = ?", roomID, userID).
		Order("CASE WHEN deleted_at IS NULL THEN 0 ELSE 1 END").
		First(&roomMember).Error
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
	if roomMember.DeletedAt.Valid {
		return db.Unscoped().Model(&roomMember).Updates(map[string]interface{}{
			"role":       role,
			"deleted_at": nil,
		}).Error
	}

	if roomMember.Role == role || roomMember.Role == model.Creator {
		return nil
	}
	// Adding a regular member must never silently demote an administrator.
	if role == model.Member && roomMember.Role == model.Admin {
		return nil
	}

	return db.Model(&roomMember).Update("role", role).Error
}

func containsUintID(ids []uint, target uint) bool {
	for _, id := range ids {
		if id == target {
			return true
		}
	}
	return false
}

func hasZeroUintID(ids ...[]uint) bool {
	for _, group := range ids {
		for _, id := range group {
			if id == 0 {
				return true
			}
		}
	}
	return false
}

func hasUintIDOverlap(left, right []uint) bool {
	set := make(map[uint]struct{}, len(left))
	for _, id := range left {
		set[id] = struct{}{}
	}
	for _, id := range right {
		if _, exists := set[id]; exists {
			return true
		}
	}
	return false
}

func ensureTenantUsersExist(db *gorm.DB, tenantID uint, ids []uint) error {
	ids = uniqueUintIDs(ids)
	if len(ids) == 0 {
		return nil
	}

	var count int64
	query := db.Model(&model.User{}).Where("id IN ?", ids)
	if tenantID != 0 {
		query = query.Where("tenant_id = ?", tenantID)
	}
	if err := query.Count(&count).Error; err != nil {
		return err
	}
	if count != int64(len(ids)) {
		return fmt.Errorf("%w: one or more users do not exist", ErrInvalidRoomUpdate)
	}
	return nil
}

// 假设房间表名为 rooms，字段有 id, name, created_at, updated_at
// type Room struct {
// 	model.Room
// 	// ID        string `gorm:"primaryKey" json:"id"`
// 	// Name      string `json:"name"`
// 	// CreatedAt int64  `json:"created_at"`
// 	// UpdatedAt int64  `json:"updated_at"`
// }

func (s *roomService) CreateRoom(ctx context.Context, req v1.RoomCreateRequest) (*RoomCreateResult, error) {
	creatorID := req.GetCreatorID()
	name := strings.TrimSpace(req.Name)
	if creatorID == 0 || name == "" {
		return nil, fmt.Errorf("%w: creator and room name are required", ErrInvalidRoomUpdate)
	}

	adminIDs := uniqueUintIDs(req.GetAdminIDs(), creatorID)
	excludedMemberIDs := append([]uint{creatorID}, adminIDs...)
	memberIDs := uniqueUintIDs(req.GetMemberIDs(), excludedMemberIDs...)
	roomUserIDs := append([]uint{creatorID}, adminIDs...)
	roomUserIDs = append(roomUserIDs, memberIDs...)
	room := &model.Room{TenantID: req.TenantID, Name: name, Image: req.Image}
	if room.TenantID == 0 {
		room.TenantID = 1
	}

	if err := s.tm.Transaction(ctx, func(txCtx context.Context) error {
		db := s.tm.(*repository.Repository).DB(txCtx)
		if err := ensureTenantUsersExist(db, room.TenantID, roomUserIDs); err != nil {
			return err
		}
		if err := db.Create(room).Error; err != nil {
			return err
		}
		if err := db.Create(&model.RoomMember{
			RoomID: room.ID,
			UserID: creatorID,
			Role:   model.Creator,
		}).Error; err != nil {
			return err
		}
		for _, adminID := range adminIDs {
			if err := upsertRoomMember(db, room.ID, adminID, model.Admin); err != nil {
				return err
			}
		}
		for _, memberID := range memberIDs {
			if err := upsertRoomMember(db, room.ID, memberID, model.Member); err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		return nil, err
	}

	detail, err := s.GetRoomByID(ctx, room.ID, creatorID, 6, 0, 6, 0)
	if err != nil {
		return nil, err
	}
	return &RoomCreateResult{
		Room:        detail,
		RoomID:      room.ID,
		AdminIDs:    adminIDs,
		MemberIDs:   memberIDs,
		RoomUserIDs: roomUserIDs,
	}, nil
}

func (s *roomService) GetRoomByID(ctx context.Context, id, viewerID uint, memberLimit, memberOffset, adminLimit, adminOffset int) (interface{}, error) {
	db := s.tm.(*repository.Repository).DB(ctx)
	room, err := loadRoomForMessages(db, id)
	if err != nil {
		return nil, err
	}
	if memberLimit <= 0 {
		memberLimit = 6
	}
	if memberOffset < 0 {
		memberOffset = 0
	}
	if adminLimit <= 0 {
		adminLimit = 6
	}
	if adminOffset < 0 {
		adminOffset = 0
	}

	members, memberTotalCount, err := loadRoomUsersWithCreator(db, id, viewerID, room.Creator, model.Member, memberLimit, memberOffset)
	if err != nil {
		return nil, err
	}
	room.Members = members
	admins, adminTotalCount, err := loadRoomUsersWithCreator(db, id, viewerID, room.Creator, model.Admin, adminLimit, adminOffset)
	if err != nil {
		return nil, err
	}
	room.Admins = admins
	participantTotalCount, err := countRoomParticipants(db, id)
	if err != nil {
		return nil, err
	}
	viewerRole, err := getViewerRole(db, id, viewerID)
	if err != nil {
		return nil, err
	}

	return &roomDetailResponse{
		ID:                    room.ID,
		Name:                  room.Name,
		Image:                 room.Image,
		ChannelType:           room.ChannelType,
		IsMember:              viewerRole != "",
		ReadSeq:               room.ReadSeq,
		Member:                room.Members,
		MemberTotalCount:      memberTotalCount,
		Admin:                 room.Admins,
		AdminTotalCount:       adminTotalCount,
		ParticipantTotalCount: participantTotalCount,
		Creator:               room.Creator,
		Message:               []*roomMessageResponse{},
		TotalCount:            0,
		CreatedAt:             room.CreatedAt,
		UpdatedAt:             room.UpdatedAt,
	}, nil
}

func readSequenceValue(value interface{}) int {
	switch typed := value.(type) {
	case int:
		return typed
	case int32:
		return int(typed)
	case int64:
		return int(typed)
	case float32:
		return int(typed)
	case float64:
		return int(typed)
	case json.Number:
		sequence, _ := typed.Int64()
		return int(sequence)
	case string:
		sequence, _ := strconv.Atoi(typed)
		return sequence
	default:
		return 0
	}
}

func (s *roomService) GetMessageReaders(ctx context.Context, roomID, messageID uint, limit, offset int) (interface{}, error) {
	db := s.tm.(*repository.Repository).DB(ctx)
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	var room model.Room
	if err := db.Select("id", "read_seq").Where("id = ?", roomID).First(&room).Error; err != nil {
		return nil, err
	}

	var message model.Message
	roomIDString := strconv.Itoa(int(roomID))
	if err := db.Select("id", "seq", "user_id").
		Where("id = ? AND (channel_id = ? OR room_id = ?)", messageID, roomIDString, roomIDString).
		First(&message).Error; err != nil {
		return nil, err
	}

	readerIDs := make([]uint, 0, len(room.ReadSeq))
	for userID, sequence := range room.ReadSeq {
		if userID == message.UserId || readSequenceValue(sequence) < message.Seq {
			continue
		}
		parsedID, err := strconv.ParseUint(userID, 10, 64)
		if err == nil && parsedID > 0 {
			readerIDs = append(readerIDs, uint(parsedID))
		}
	}

	if len(readerIDs) == 0 {
		return &messageReadersResponse{Users: []*roomMessageUser{}, TotalCount: 0}, nil
	}

	baseQuery := func() *gorm.DB {
		return db.Model(&model.User{}).
			Joins("JOIN room_members ON room_members.user_id = users.id").
			Where("room_members.room_id = ? AND users.id IN ?", roomID, readerIDs)
	}

	var totalCount int64
	if err := baseQuery().Distinct("users.id").Count(&totalCount).Error; err != nil {
		return nil, err
	}

	var users []*model.User
	if err := baseQuery().Order("users.id ASC").Offset(offset).Limit(limit).Find(&users).Error; err != nil {
		return nil, err
	}
	readerUsers := make([]*roomMessageUser, 0, len(users))
	for _, user := range users {
		readerUsers = append(readerUsers, buildRoomMessageUser(user))
	}

	return &messageReadersResponse{Users: readerUsers, TotalCount: totalCount}, nil
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

func (s *roomService) GetRoomMessagesByCursor(ctx context.Context, roomID uint, direction string, seq, limit int) (interface{}, error) {
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
	if seq <= 0 {
		return nil, errors.New("invalid message cursor")
	}

	channelID := strconv.Itoa(int(room.ID))
	query := db.Where("channel_id = ?", channelID)
	if direction == "before" {
		query = query.Where("seq < ?", seq).Order("seq DESC")
	} else if direction == "after" {
		query = query.Where("seq > ?", seq).Order("seq ASC")
	} else {
		return nil, errors.New("invalid message direction")
	}

	var messages []model.Message
	if err := query.Limit(limit + 1).Find(&messages).Error; err != nil {
		return nil, err
	}
	hasMore := len(messages) > limit
	if hasMore {
		messages = messages[:limit]
	}
	if direction == "before" {
		for left, right := 0, len(messages)-1; left < right; left, right = left+1, right-1 {
			messages[left], messages[right] = messages[right], messages[left]
		}
	}

	responseMessages, err := buildRoomMessageResponses(db, room, messages)
	if err != nil {
		return nil, err
	}
	return &roomMessagePageResponse{Message: responseMessages, HasMore: hasMore}, nil
}

func (s *roomService) SearchRoomMessages(ctx context.Context, roomID uint, searchQuery string, limit, offset int) (interface{}, error) {
	db := s.tm.(*repository.Repository).DB(ctx)
	room, err := loadRoomForMessages(db, roomID)
	if err != nil {
		return nil, err
	}
	searchQuery = strings.TrimSpace(searchQuery)
	if searchQuery == "" {
		return &roomMessageSearchResponse{Message: []*roomMessageResponse{}, TotalCount: 0}, nil
	}
	if limit <= 0 {
		limit = 20
	}
	if limit > 50 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	channelID := strconv.Itoa(int(room.ID))
	baseQuery := db.Model(&model.Message{}).
		Where("channel_id = ? AND content_type = ? AND is_recalled = ?", channelID, "TEXT_MESSAGE", false).
		Where("text_message LIKE ?", "%"+searchQuery+"%")
	var totalCount int64
	if err := baseQuery.Count(&totalCount).Error; err != nil {
		return nil, err
	}
	var messages []model.Message
	if err := baseQuery.Order("seq DESC").Offset(offset).Limit(limit).Find(&messages).Error; err != nil {
		return nil, err
	}
	responseMessages, err := buildRoomMessageResponses(db, room, messages)
	if err != nil {
		return nil, err
	}
	return &roomMessageSearchResponse{Message: responseMessages, TotalCount: totalCount}, nil
}

func buildRoomMessageResponses(db *gorm.DB, room *model.Room, messages []model.Message) ([]*roomMessageResponse, error) {
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
	return responseMessages, nil
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

	beforeLimit := limit / 2
	var beforeMessages []model.Message
	if err := db.Where("channel_id = ? AND seq < ?", channelID, targetMessage.Seq).
		Order("seq DESC").Limit(beforeLimit).Find(&beforeMessages).Error; err != nil {
		return nil, err
	}
	for left, right := 0, len(beforeMessages)-1; left < right; left, right = left+1, right-1 {
		beforeMessages[left], beforeMessages[right] = beforeMessages[right], beforeMessages[left]
	}
	afterLimit := limit - len(beforeMessages)
	var afterMessages []model.Message
	if err := db.Where("channel_id = ? AND seq >= ?", channelID, targetMessage.Seq).
		Order("seq ASC").Limit(afterLimit).Find(&afterMessages).Error; err != nil {
		return nil, err
	}
	messages := append(beforeMessages, afterMessages...)
	responseMessages, err := buildRoomMessageResponses(db, room, messages)
	if err != nil {
		return nil, err
	}
	hasMoreBefore := targetIndex > int64(len(beforeMessages))
	hasMoreAfter := totalCount > targetIndex+int64(len(afterMessages))

	return &roomMessageWindowResponse{
		Message:       responseMessages,
		TargetID:      targetMessage.ID,
		TargetIndex:   targetIndex,
		TotalCount:    totalCount,
		HasMoreBefore: hasMoreBefore,
		HasMoreAfter:  hasMoreAfter,
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

func countRoomParticipants(db *gorm.DB, roomID uint) (int64, error) {
	var totalCount int64
	err := db.Model(&model.RoomMember{}).
		Where("room_id = ?", roomID).
		Distinct("user_id").
		Count(&totalCount).Error
	return totalCount, err
}

func loadRoomUsersWithCreator(db *gorm.DB, roomID, viewerID uint, creator *model.User, role string, limit, offset int) ([]*model.User, int64, error) {
	if creator == nil {
		return loadRoomUsersByRole(db, roomID, viewerID, role, limit, offset)
	}

	roleLimit := limit
	roleOffset := offset
	if offset == 0 {
		roleLimit--
	} else {
		roleOffset--
	}

	users, totalCount, err := loadRoomUsersByRole(db, roomID, viewerID, role, roleLimit, roleOffset)
	if err != nil {
		return nil, 0, err
	}
	totalCount++

	if offset > 0 || limit <= 0 {
		return users, totalCount, nil
	}

	result := make([]*model.User, 0, len(users)+1)
	result = append(result, creator)
	result = append(result, users...)
	return result, totalCount, nil
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

func (s *roomService) AuthorizeRoomAccess(ctx context.Context, roomID, userID uint, allowPublic bool) error {
	if roomID == 0 || userID == 0 {
		return ErrRoomForbidden
	}

	db := s.tm.(*repository.Repository).DB(ctx)
	var room model.Room
	query := db.Select("id", "channel_type").Where("id = ?", roomID)
	if tenantID := repository.TenantIDFromContext(ctx); tenantID != 0 {
		query = query.Where("tenant_id = ?", tenantID)
	}
	if err := query.First(&room).Error; err != nil {
		return err
	}

	var membershipCount int64
	if err := db.Model(&model.RoomMember{}).
		Where("room_id = ? AND user_id = ?", roomID, userID).
		Count(&membershipCount).Error; err != nil {
		return err
	}
	if membershipCount > 0 || (allowPublic && room.ChannelType == model.RoomTypeGroup) {
		return nil
	}
	return ErrRoomForbidden
}

func (s *roomService) ListRooms(ctx context.Context, userID uint) (interface{}, error) {
	if userID == 0 {
		return nil, ErrRoomForbidden
	}
	db := s.tm.(*repository.Repository).DB(ctx)
	var rooms []model.Room
	query := db.
		Joins("JOIN room_members ON room_members.room_id = rooms.id").
		Where("room_members.user_id = ? AND room_members.deleted_at IS NULL", userID).
		Distinct("rooms.*")
	if tenantID := repository.TenantIDFromContext(ctx); tenantID != 0 {
		query = query.Where("rooms.tenant_id = ?", tenantID)
	}
	if err := query.
		Preload("Members").
		Preload("Admins").
		Preload("CreatorList").
		Find(&rooms).Error; err != nil {
		return nil, err
	}
	return rooms, nil
}

func (s *roomService) UpdateRoom(ctx context.Context, operatorID uint, req v1.RoomUpdateRequest) (*RoomUpdateResult, error) {
	if operatorID == 0 || req.GetID() == 0 {
		return nil, fmt.Errorf("%w: missing room or operator", ErrInvalidRoomUpdate)
	}

	adminIDs := uniqueUintIDs(req.GetAdminIDs())
	memberIDs := uniqueUintIDs(req.GetMemberIDs())
	removeAdminIDs := uniqueUintIDs(req.GetRemoveAdminIDs())
	removeMemberIDs := uniqueUintIDs(req.GetRemoveMemberIDs())
	newCreatorID := req.GetNewCreatorID()

	if hasZeroUintID(req.GetAdminIDs(), req.GetMemberIDs(), req.GetRemoveAdminIDs(), req.GetRemoveMemberIDs()) {
		return nil, fmt.Errorf("%w: user ids must be positive", ErrInvalidRoomUpdate)
	}
	if req.NewCreatorID != nil && newCreatorID == 0 {
		return nil, fmt.Errorf("%w: new creator id must be positive", ErrInvalidRoomUpdate)
	}
	if hasUintIDOverlap(adminIDs, removeAdminIDs) || hasUintIDOverlap(memberIDs, removeMemberIDs) {
		return nil, fmt.Errorf("%w: the same role cannot be added and removed", ErrInvalidRoomUpdate)
	}
	if newCreatorID != 0 && (containsUintID(removeAdminIDs, newCreatorID) || containsUintID(removeMemberIDs, newCreatorID)) {
		return nil, fmt.Errorf("%w: new creator cannot also be removed", ErrInvalidRoomUpdate)
	}
	if newCreatorID != 0 && (containsUintID(adminIDs, newCreatorID) || containsUintID(memberIDs, newCreatorID)) {
		return nil, fmt.Errorf("%w: new creator cannot also receive another role", ErrInvalidRoomUpdate)
	}
	if req.Name != nil && strings.TrimSpace(*req.Name) == "" {
		return nil, fmt.Errorf("%w: room name cannot be empty", ErrInvalidRoomUpdate)
	}

	result := &RoomUpdateResult{}
	err := s.tm.Transaction(ctx, func(txCtx context.Context) error {
		db := s.tm.(*repository.Repository).DB(txCtx)
		var room model.Room
		roomQuery := db.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", req.GetID())
		if req.TenantID != 0 {
			roomQuery = roomQuery.Where("tenant_id = ?", req.TenantID)
		}
		if err := roomQuery.First(&room).Error; err != nil {
			return err
		}

		var memberships []model.RoomMember
		if err := db.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("room_id = ?", room.ID).
			Find(&memberships).Error; err != nil {
			return err
		}
		roles := make(map[uint]string, len(memberships))
		for _, membership := range memberships {
			roles[membership.UserID] = membership.Role
		}

		operatorRole := roles[operatorID]
		if operatorRole != model.Creator && operatorRole != model.Admin {
			return ErrRoomForbidden
		}
		creatorOnlyChange := len(adminIDs) > 0 || len(removeAdminIDs) > 0 || req.NewCreatorID != nil
		if operatorRole != model.Creator && creatorOnlyChange {
			return ErrRoomForbidden
		}
		if operatorRole == model.Creator &&
			(containsUintID(removeAdminIDs, operatorID) || containsUintID(removeMemberIDs, operatorID)) {
			return fmt.Errorf("%w: creator cannot be removed or downgraded", ErrInvalidRoomUpdate)
		}

		if err := ensureTenantUsersExist(db, room.TenantID, append(append([]uint{}, adminIDs...), memberIDs...)); err != nil {
			return err
		}
		if newCreatorID != 0 && newCreatorID != operatorID {
			if _, exists := roles[newCreatorID]; !exists {
				return fmt.Errorf("%w: new creator must already be a room participant", ErrInvalidRoomUpdate)
			}
		}

		updates := map[string]interface{}{}
		if req.Name != nil {
			name := strings.TrimSpace(*req.Name)
			if name != room.Name {
				updates["name"] = name
				result.PreviousName = room.Name
				result.NewName = name
				result.NameChanged = true
			}
		}
		if req.Image != nil && *req.Image != room.Image {
			// An explicitly supplied empty string clears the room avatar.
			updates["image"] = *req.Image
			result.ImageChanged = true
		}
		if len(updates) > 0 {
			if err := db.Model(&room).Updates(updates).Error; err != nil {
				return err
			}
			result.MetadataChanged = true
		}

		// Removing an administrator means demoting them to a regular member.
		for _, userID := range removeAdminIDs {
			if roles[userID] != model.Admin {
				continue
			}
			if err := db.Model(&model.RoomMember{}).
				Where("room_id = ? AND user_id = ? AND role = ?", room.ID, userID, model.Admin).
				Update("role", model.Member).Error; err != nil {
				return err
			}
			roles[userID] = model.Member
			result.RemovedAdminIDs = append(result.RemovedAdminIDs, userID)
		}
		for _, userID := range removeMemberIDs {
			if roles[userID] != model.Member {
				continue
			}
			if err := db.Unscoped().Where("room_id = ? AND user_id = ? AND role = ?", room.ID, userID, model.Member).
				Delete(&model.RoomMember{}).Error; err != nil {
				return err
			}
			delete(roles, userID)
			result.RemovedMemberIDs = append(result.RemovedMemberIDs, userID)
		}

		for _, userID := range adminIDs {
			previousRole := roles[userID]
			if previousRole == model.Admin || previousRole == model.Creator {
				continue
			}
			if err := upsertRoomMember(db, room.ID, userID, model.Admin); err != nil {
				return err
			}
			roles[userID] = model.Admin
			result.AddedAdminIDs = append(result.AddedAdminIDs, userID)
		}
		for _, userID := range memberIDs {
			if _, exists := roles[userID]; exists {
				continue
			}
			if err := upsertRoomMember(db, room.ID, userID, model.Member); err != nil {
				return err
			}
			roles[userID] = model.Member
			result.AddedMemberIDs = append(result.AddedMemberIDs, userID)
		}

		if newCreatorID != 0 && newCreatorID != operatorID {
			if err := db.Model(&model.RoomMember{}).
				Where("room_id = ? AND user_id = ? AND role = ?", room.ID, operatorID, model.Creator).
				Update("role", model.Admin).Error; err != nil {
				return err
			}
			if err := db.Model(&model.RoomMember{}).
				Where("room_id = ? AND user_id = ?", room.ID, newCreatorID).
				Update("role", model.Creator).Error; err != nil {
				return err
			}
			roles[operatorID] = model.Admin
			roles[newCreatorID] = model.Creator
			result.PreviousCreatorID = operatorID
			result.NewCreatorID = newCreatorID
		}

		result.RoomUserIDs = make([]uint, 0, len(roles))
		for userID := range roles {
			result.RoomUserIDs = append(result.RoomUserIDs, userID)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	room, err := s.GetRoomByID(ctx, req.GetID(), operatorID, 6, 0, 6, 0)
	if err != nil {
		return nil, err
	}
	result.Room = room
	return result, nil
}

func (s *roomService) JoinRoom(ctx context.Context, userID, roomID uint) (*RoomJoinResult, error) {
	if userID == 0 {
		return nil, ErrRoomForbidden
	}

	result := &RoomJoinResult{}
	err := s.tm.Transaction(ctx, func(txCtx context.Context) error {
		db := s.tm.(*repository.Repository).DB(txCtx)
		var room model.Room
		query := db.Clauses(clause.Locking{Strength: "UPDATE"}).Model(&model.Room{})
		if tenantID := repository.TenantIDFromContext(txCtx); tenantID != 0 {
			query = query.Where("tenant_id = ?", tenantID)
		}
		if roomID == 0 {
			if err := query.Where("channel_type = ?", model.RoomTypeGroup).Order("id ASC").First(&room).Error; err != nil {
				return err
			}
		} else if err := query.Where("id = ?", roomID).First(&room).Error; err != nil {
			return err
		}
		result.RoomID = room.ID

		var membership model.RoomMember
		err := db.Where("room_id = ? AND user_id = ?", room.ID, userID).First(&membership).Error
		isMember := err == nil
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		if !isMember {
			if room.ChannelType == model.RoomTypePrivate {
				return ErrRoomForbidden
			}
			if err := ensureTenantUsersExist(db, room.TenantID, []uint{userID}); err != nil {
				return err
			}
			if err := upsertRoomMember(db, room.ID, userID, model.Member); err != nil {
				return err
			}
			result.Added = true
		}
		return db.Model(&model.RoomMember{}).
			Where("room_id = ?", room.ID).
			Distinct("user_id").
			Pluck("user_id", &result.RoomUserIDs).Error
	})
	if err != nil {
		return nil, err
	}

	room, err := s.GetRoomByID(ctx, result.RoomID, userID, 6, 0, 6, 0)
	if err != nil {
		return nil, err
	}
	result.Room = room
	return result, nil
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

// RecallMessage replaces the payload of an existing message with a recall
// marker. Keeping the row preserves room sequence numbers and reply links.
// Authorization and tenant checks live in this transaction as well as in the
// HTTP middleware so non-HTTP callers cannot bypass them.
func (s *roomService) RecallMessage(ctx context.Context, operatorID, roomID, messageID uint) (*RoomMessageRecallResult, error) {
	if operatorID == 0 || messageID == 0 {
		return nil, fmt.Errorf("%w: operator and message ids must be positive", ErrInvalidRoomUpdate)
	}

	var message model.Message
	err := s.tm.Transaction(ctx, func(txCtx context.Context) error {
		db := s.tm.(*repository.Repository).DB(txCtx)
		messageQuery := db.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ?", messageID)
		if tenantID := repository.TenantIDFromContext(txCtx); tenantID != 0 {
			messageQuery = messageQuery.Where("tenant_id = ?", tenantID)
		}
		if err := messageQuery.First(&message).Error; err != nil {
			return err
		}

		messageRoomID, err := strconv.ParseUint(message.ChannelId, 10, 64)
		if err != nil || messageRoomID == 0 {
			return gorm.ErrRecordNotFound
		}
		if roomID == 0 {
			roomID = uint(messageRoomID)
		}
		channelID := strconv.FormatUint(uint64(roomID), 10)
		if message.ChannelId != channelID || message.RoomId != channelID {
			return gorm.ErrRecordNotFound
		}

		var room model.Room
		roomQuery := db.Clauses(clause.Locking{Strength: "UPDATE"}).
			Select("id", "tenant_id").
			Where("id = ? AND tenant_id = ?", roomID, message.TenantID)
		if tenantID := repository.TenantIDFromContext(txCtx); tenantID != 0 {
			roomQuery = roomQuery.Where("tenant_id = ?", tenantID)
		}
		if err := roomQuery.First(&room).Error; err != nil {
			return err
		}

		var membership model.RoomMember
		if err := db.Select("id").
			Where("room_id = ? AND user_id = ?", room.ID, operatorID).
			First(&membership).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrRoomForbidden
			}
			return err
		}

		operator := strconv.FormatUint(uint64(operatorID), 10)
		if message.UserId != operator {
			return ErrRoomForbidden
		}

		// Repeating a successful recall is intentionally idempotent.
		if message.IsRecalled && message.ContentType == "RECALL_MESSAGE" {
			return nil
		}

		recallPayload, err := json.Marshal(map[string]interface{}{
			"operator":    operator,
			"recallMsgId": message.ID,
		})
		if err != nil {
			return err
		}
		updates := map[string]interface{}{
			"content_type":   "RECALL_MESSAGE",
			"text_message":   "null",
			"media_message":  "null",
			"read_message":   "null",
			"system_message": "null",
			"recall_message": string(recallPayload),
			"is_recalled":    true,
		}
		result := db.Model(&model.Message{}).
			Where("id = ? AND tenant_id = ? AND channel_id = ? AND room_id = ? AND user_id = ?", message.ID, room.TenantID, channelID, channelID, operator).
			Updates(updates)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return gorm.ErrRecordNotFound
		}

		return db.Where("id = ? AND tenant_id = ? AND channel_id = ? AND room_id = ?", message.ID, room.TenantID, channelID, channelID).
			First(&message).Error
	})
	if err != nil {
		return nil, err
	}

	return &RoomMessageRecallResult{
		Message:  &message,
		Response: buildRoomMessageResponse(message, nil, nil, nil),
	}, nil
}

func (s *roomService) DeleteRoom(ctx context.Context, operatorID, id uint) (*RoomDeleteResult, error) {
	if operatorID == 0 || id == 0 {
		return nil, ErrRoomForbidden
	}

	result := &RoomDeleteResult{}
	err := s.tm.Transaction(ctx, func(txCtx context.Context) error {
		db := s.tm.(*repository.Repository).DB(txCtx)
		var room model.Room
		roomQuery := db.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", id)
		if tenantID := repository.TenantIDFromContext(txCtx); tenantID != 0 {
			roomQuery = roomQuery.Where("tenant_id = ?", tenantID)
		}
		if err := roomQuery.First(&room).Error; err != nil {
			return err
		}

		var creator model.RoomMember
		if err := db.Where("room_id = ? AND user_id = ? AND role = ?", id, operatorID, model.Creator).
			First(&creator).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrRoomForbidden
			}
			return err
		}

		if err := db.Model(&model.RoomMember{}).
			Where("room_id = ?", id).
			Distinct("user_id").
			Pluck("user_id", &result.RoomUserIDs).Error; err != nil {
			return err
		}
		if err := db.Unscoped().Where("room_id = ?", id).Delete(&model.RoomMember{}).Error; err != nil {
			return err
		}
		return db.Delete(&room).Error
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}
