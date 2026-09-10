package repository

import (
	v1 "backend-go/api/v1"
	"backend-go/internal/model"
	"context"
	"encoding/json"
	"errors"
	"sort"
	"strconv"
	"strings"

	"gorm.io/gorm"
)

type UserRepository interface {
	Create(ctx context.Context, user *model.User) error
	Update(ctx context.Context, user *model.User) error
	UpdateFields(ctx context.Context, id int, fields map[string]interface{}) error
	GetByID(ctx context.Context, id int) (*model.User, error)
	GetProfileByID(ctx context.Context, id int) (*model.User, error)
	GetByEmail(ctx context.Context, email string) (*model.User, error)
	List(ctx context.Context, req v1.ListUsersRequest) ([]model.User, int64, error)
}

type RoomMembershipRepository interface {
	AreUsersInRoom(ctx context.Context, roomID uint, userIDs []uint) (bool, error)
	ListRoomUserIDs(ctx context.Context, roomID uint) ([]uint, error)
}

// ProfileAudienceRepository resolves the users that share at least one active
// room with a profile owner. It keeps profile events scoped to people who are
// already allowed to see that user in the chat UI.
type ProfileAudienceRepository interface {
	ListProfileAudienceUserIDs(ctx context.Context, userID uint) ([]uint, error)
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

func (r *userRepository) AreUsersInRoom(ctx context.Context, roomID uint, userIDs []uint) (bool, error) {
	uniqueUserIDs := make(map[uint]struct{}, len(userIDs))
	for _, userID := range userIDs {
		if userID != 0 {
			uniqueUserIDs[userID] = struct{}{}
		}
	}
	if roomID == 0 || len(uniqueUserIDs) == 0 {
		return false, nil
	}

	ids := make([]uint, 0, len(uniqueUserIDs))
	for userID := range uniqueUserIDs {
		ids = append(ids, userID)
	}
	var count int64
	err := r.DB(ctx).
		Table("room_members").
		Where("room_id = ? AND user_id IN ? AND deleted_at IS NULL", roomID, ids).
		Distinct("user_id").
		Count(&count).Error
	return count == int64(len(ids)), err
}

func (r *userRepository) ListRoomUserIDs(ctx context.Context, roomID uint) ([]uint, error) {
	if roomID == 0 {
		return nil, nil
	}

	var userIDs []uint
	err := r.DB(ctx).
		Table("room_members").
		Where("room_id = ? AND deleted_at IS NULL", roomID).
		Distinct("user_id").
		Order("user_id ASC").
		Pluck("user_id", &userIDs).Error
	return userIDs, err
}

func (r *userRepository) ListProfileAudienceUserIDs(ctx context.Context, userID uint) ([]uint, error) {
	if userID == 0 {
		return nil, nil
	}

	var userIDs []uint
	err := r.DB(ctx).
		Table("room_members AS owner_rooms").
		Select("DISTINCT audience.user_id").
		Joins("JOIN room_members AS audience ON audience.room_id = owner_rooms.room_id AND audience.deleted_at IS NULL").
		Joins("JOIN rooms ON rooms.id = owner_rooms.room_id AND rooms.deleted_at IS NULL").
		Joins("JOIN users ON users.id = audience.user_id AND users.deleted_at IS NULL").
		Where("owner_rooms.user_id = ? AND owner_rooms.deleted_at IS NULL", userID).
		Where("audience.user_id <> 0 AND audience.user_id <> ?", userID).
		Order("audience.user_id ASC").
		Pluck("audience.user_id", &userIDs).Error
	return userIDs, err
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

func readSequenceForUser(readSeq map[string]interface{}, userID string) int {
	value, exists := readSeq[userID]
	if !exists {
		return 0
	}

	switch typed := value.(type) {
	case int:
		return typed
	case int32:
		return int(typed)
	case int64:
		return int(typed)
	case uint:
		return int(typed)
	case uint32:
		return int(typed)
	case uint64:
		return int(typed)
	case float64:
		return int(typed)
	case json.Number:
		parsed, _ := typed.Int64()
		return int(parsed)
	case string:
		parsed, _ := strconv.Atoi(typed)
		return parsed
	default:
		return 0
	}
}

func (r *userRepository) loadUnreadCounts(ctx context.Context, user *model.User) error {
	if len(user.Rooms) == 0 {
		return nil
	}

	userID := strconv.Itoa(int(user.ID))
	conditions := make([]string, 0, len(user.Rooms))
	args := make([]interface{}, 0, len(user.Rooms)*2)
	for index := range user.Rooms {
		room := &user.Rooms[index]
		lastReadSeq := readSequenceForUser(room.ReadSeq, userID)
		conditions = append(conditions, "(channel_id = ? AND seq > ?)")
		args = append(args, strconv.Itoa(int(room.ID)), lastReadSeq)
	}

	type unreadCountRow struct {
		ChannelID   string `gorm:"column:channel_id"`
		UnreadCount int64  `gorm:"column:unread_count"`
	}
	var rows []unreadCountRow
	if err := r.DB(ctx).
		Model(&model.Message{}).
		Select("channel_id, COUNT(*) AS unread_count").
		Where("user_id != ?", userID).
		Where("("+strings.Join(conditions, " OR ")+")", args...).
		Group("channel_id").
		Scan(&rows).Error; err != nil {
		return err
	}

	countsByRoom := make(map[string]int64, len(rows))
	for _, row := range rows {
		countsByRoom[row.ChannelID] = row.UnreadCount
	}
	for index := range user.Rooms {
		room := &user.Rooms[index]
		room.UnreadCount = countsByRoom[strconv.Itoa(int(room.ID))]
	}
	return nil
}

func (r *userRepository) loadLatestRoomMessages(ctx context.Context, user *model.User) error {
	if len(user.Rooms) == 0 {
		return nil
	}

	roomIDs := make([]string, 0, len(user.Rooms))
	for index := range user.Rooms {
		roomIDs = append(roomIDs, strconv.Itoa(int(user.Rooms[index].ID)))
	}

	latestMessages := r.DB(ctx).
		Model(&model.Message{}).
		Select("channel_id, MAX(seq) AS max_seq").
		Where("channel_id IN ?", roomIDs).
		Group("channel_id")

	var messages []model.Message
	if err := r.DB(ctx).
		Model(&model.Message{}).
		Joins("JOIN (?) AS latest ON latest.channel_id = messages.channel_id AND latest.max_seq = messages.seq", latestMessages).
		Find(&messages).Error; err != nil {
		return err
	}

	latestByRoom := make(map[string]*model.Message, len(messages))
	for index := range messages {
		message := &messages[index]
		latestByRoom[message.ChannelId] = message
	}
	for index := range user.Rooms {
		room := &user.Rooms[index]
		room.LastMsg = model.NewMessageSummary(
			latestByRoom[strconv.Itoa(int(room.ID))],
		)
	}

	sort.SliceStable(user.Rooms, func(left, right int) bool {
		leftMessage := user.Rooms[left].LastMsg
		rightMessage := user.Rooms[right].LastMsg
		if leftMessage == nil || rightMessage == nil {
			if leftMessage != nil {
				return true
			}
			if rightMessage != nil {
				return false
			}
			return user.Rooms[left].UpdatedAt.After(user.Rooms[right].UpdatedAt)
		}
		return leftMessage.CreatedAt.After(rightMessage.CreatedAt)
	})
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
	if err := r.loadUnreadCounts(ctx, &user); err != nil {
		return nil, err
	}
	if err := r.loadLatestRoomMessages(ctx, &user); err != nil {
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

func (r *userRepository) List(ctx context.Context, req v1.ListUsersRequest) ([]model.User, int64, error) {
	var users []model.User
	var totalCount int64
	query := r.DB(ctx).Model(&model.User{})
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

	if err := query.Count(&totalCount).Error; err != nil {
		return nil, 0, err
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
		return nil, 0, err
	}

	return users, totalCount, nil
}
