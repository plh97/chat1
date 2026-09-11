package repository

import (
	v1 "backend-go/api/v1"
	"backend-go/internal/model"
	"backend-go/internal/repository"
	"backend-go/pkg/log"
	"context"
	"encoding/json"
	"strconv"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"
)

var logger *log.Logger

func setupRepositoryWithDB(t *testing.T) (repository.UserRepository, *gorm.DB) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open gorm connection: %v", err)
	}
	if err := db.AutoMigrate(&model.User{}, &model.Room{}, &model.RoomMember{}, &model.Message{}); err != nil {
		t.Fatalf("failed to migrate schema: %v", err)
	}

	repo := repository.NewRepository(logger, db)
	return repository.NewUserRepository(repo), db
}

func setupRepository(t *testing.T) repository.UserRepository {
	userRepo, _ := setupRepositoryWithDB(t)
	return userRepo
}

func TestUserRepository_Create(t *testing.T) {
	userRepo := setupRepository(t)

	ctx := context.Background()
	user := &model.User{
		UserName: "Test",
		Password: "password",
		Email:    "test@example.com",
	}

	err := userRepo.Create(ctx, user)
	assert.NoError(t, err)
	assert.NotZero(t, user.ID)
}

func TestUserRepository_Update(t *testing.T) {
	userRepo := setupRepository(t)

	ctx := context.Background()
	user := &model.User{
		UserName: "Test",
		Password: "password",
		Email:    "test@example.com",
	}
	assert.NoError(t, userRepo.Create(ctx, user))

	user.Email = "updated@example.com"
	err := userRepo.Update(ctx, user)
	assert.NoError(t, err)

	fetched, err := userRepo.GetByEmail(ctx, "updated@example.com")
	assert.NoError(t, err)
	assert.NotNil(t, fetched)
	assert.Equal(t, "updated@example.com", fetched.Email)
}

func TestUserRepository_GetById(t *testing.T) {
	userRepo := setupRepository(t)

	ctx := context.Background()
	user := &model.User{
		UserName: "test",
		Password: "password",
		Email:    "test@example.com",
	}
	assert.NoError(t, userRepo.Create(ctx, user))

	fetched, err := userRepo.GetByID(ctx, int(user.ID))
	assert.NoError(t, err)
	assert.NotNil(t, fetched)
	assert.Equal(t, user.Email, fetched.Email)
}

func TestUserRepository_GetAndUpdateByIDStayInsideTenant(t *testing.T) {
	userRepo, db := setupRepositoryWithDB(t)
	first := &model.User{TenantID: 1, UserName: "tenant-one-user", Email: "tenant-one-user@example.com"}
	second := &model.User{TenantID: 2, UserName: "tenant-two-user", Email: "tenant-two-user@example.com"}
	assert.NoError(t, db.Create([]*model.User{first, second}).Error)

	tenantOneContext := repository.WithTenantID(context.Background(), 1)
	_, err := userRepo.GetByID(tenantOneContext, int(second.ID))
	assert.ErrorIs(t, err, v1.ErrNotFound)

	assert.NoError(t, userRepo.UpdateFields(
		tenantOneContext,
		int(second.ID),
		map[string]interface{}{"username": "cross-tenant-update"},
	))
	var unchanged model.User
	assert.NoError(t, db.First(&unchanged, second.ID).Error)
	assert.Equal(t, "tenant-two-user", unchanged.UserName)
}

func TestUserRepository_PlatformRoleUsesCurrentDatabasePermission(t *testing.T) {
	userRepo, db := setupRepositoryWithDB(t)
	owner := &model.User{
		TenantID: 1, UserName: "platform-owner", Email: "platform-owner@example.com",
		Permission: "platform_owner", Status: "active",
	}
	assert.NoError(t, db.Create(owner).Error)
	roleRepo, ok := userRepo.(repository.PlatformRoleRepository)
	assert.True(t, ok)

	allowed, err := roleRepo.IsPlatformAdministrator(context.Background(), owner.ID, owner.TenantID)
	assert.NoError(t, err)
	assert.True(t, allowed)

	assert.NoError(t, db.Model(owner).Update("permission", "member").Error)
	allowed, err = roleRepo.IsPlatformAdministrator(context.Background(), owner.ID, owner.TenantID)
	assert.NoError(t, err)
	assert.False(t, allowed)
}

func TestUserRepository_AreUsersInRoom(t *testing.T) {
	userRepo, db := setupRepositoryWithDB(t)
	ctx := context.Background()
	assert.NoError(t, db.Create([]model.User{
		{ID: 7, UserName: "call-user-7", Email: "call-user-7@example.com", Status: "active"},
		{ID: 9, UserName: "call-user-9", Email: "call-user-9@example.com", Status: "active"},
	}).Error)
	room := &model.Room{Name: "Call Room", ChannelType: model.RoomTypePrivate}
	assert.NoError(t, db.Create(room).Error)
	assert.NoError(t, db.Create([]model.RoomMember{
		{RoomID: room.ID, UserID: 7, Role: model.Member},
		{RoomID: room.ID, UserID: 9, Role: model.Member},
	}).Error)

	membershipRepo, ok := userRepo.(repository.RoomMembershipRepository)
	assert.True(t, ok)
	allowed, err := membershipRepo.AreUsersInRoom(ctx, room.ID, []uint{7, 9})
	assert.NoError(t, err)
	assert.True(t, allowed)

	allowed, err = membershipRepo.AreUsersInRoom(ctx, room.ID, []uint{7, 10})
	assert.NoError(t, err)
	assert.False(t, allowed)

	userIDs, err := membershipRepo.ListRoomUserIDs(ctx, room.ID)
	assert.NoError(t, err)
	assert.Equal(t, []uint{7, 9}, userIDs)
}

func TestUserRepository_ListProfileAudienceUserIDs(t *testing.T) {
	userRepo, db := setupRepositoryWithDB(t)
	ctx := context.Background()
	owner := &model.User{UserName: "owner-audience", Email: "owner-audience@example.com"}
	peer := &model.User{UserName: "peer-audience", Email: "peer-audience@example.com"}
	removedPeer := &model.User{UserName: "removed-audience", Email: "removed-audience@example.com"}
	outsider := &model.User{UserName: "outsider-audience", Email: "outsider-audience@example.com"}
	assert.NoError(t, db.Create([]*model.User{owner, peer, removedPeer, outsider}).Error)

	firstRoom := &model.Room{Name: "Audience room one"}
	secondRoom := &model.Room{Name: "Audience room two"}
	otherRoom := &model.Room{Name: "Unrelated room"}
	assert.NoError(t, db.Create([]*model.Room{firstRoom, secondRoom, otherRoom}).Error)
	assert.NoError(t, db.Create([]model.RoomMember{
		{RoomID: firstRoom.ID, UserID: owner.ID, Role: model.Member},
		{RoomID: firstRoom.ID, UserID: peer.ID, Role: model.Member},
		{RoomID: firstRoom.ID, UserID: removedPeer.ID, Role: model.Member},
		{RoomID: secondRoom.ID, UserID: owner.ID, Role: model.Member},
		{RoomID: secondRoom.ID, UserID: peer.ID, Role: model.Member},
		{RoomID: otherRoom.ID, UserID: outsider.ID, Role: model.Member},
	}).Error)
	assert.NoError(t, db.Where("room_id = ? AND user_id = ?", firstRoom.ID, removedPeer.ID).Delete(&model.RoomMember{}).Error)

	audienceRepo, ok := userRepo.(repository.ProfileAudienceRepository)
	assert.True(t, ok)
	userIDs, err := audienceRepo.ListProfileAudienceUserIDs(ctx, owner.ID)

	assert.NoError(t, err)
	assert.Equal(t, []uint{peer.ID}, userIDs)
}

func TestUserRepository_GetByID_LoadsPrivateRoomPeer(t *testing.T) {
	userRepo, db := setupRepositoryWithDB(t)
	ctx := context.Background()
	me := &model.User{UserName: "me", Password: "password", Email: "me@example.com"}
	peer := &model.User{UserName: "peer", Password: "password", Email: "peer@example.com", Image: "https://example.com/peer.png"}
	assert.NoError(t, userRepo.Create(ctx, me))
	assert.NoError(t, userRepo.Create(ctx, peer))

	privateRoom := &model.Room{Name: "Private Chat", ChannelType: model.RoomTypePrivate}
	publicRoom := &model.Room{Name: "Common Room", ChannelType: model.RoomTypeGroup}
	assert.NoError(t, db.Create(privateRoom).Error)
	assert.NoError(t, db.Create(publicRoom).Error)
	assert.NoError(t, db.Create([]model.RoomMember{
		{RoomID: privateRoom.ID, UserID: me.ID, Role: model.Member},
		{RoomID: privateRoom.ID, UserID: peer.ID, Role: model.Member},
		{RoomID: publicRoom.ID, UserID: me.ID, Role: model.Member},
		{RoomID: publicRoom.ID, UserID: peer.ID, Role: model.Member},
	}).Error)

	fetched, err := userRepo.GetProfileByID(ctx, int(me.ID))
	assert.NoError(t, err)
	assert.Len(t, fetched.Rooms, 2)

	roomsByID := make(map[uint]model.Room, len(fetched.Rooms))
	for _, room := range fetched.Rooms {
		roomsByID[room.ID] = room
	}
	assert.NotNil(t, roomsByID[privateRoom.ID].Peer)
	assert.Equal(t, peer.ID, roomsByID[privateRoom.ID].Peer.ID)
	assert.Equal(t, peer.UserName, roomsByID[privateRoom.ID].Peer.UserName)
	assert.Equal(t, peer.Image, roomsByID[privateRoom.ID].Peer.Image)
	assert.Nil(t, roomsByID[publicRoom.ID].Peer)
}

func TestUserRepository_GetProfileByID_CountsOnlyOtherUsersUnreadMessages(t *testing.T) {
	userRepo, db := setupRepositoryWithDB(t)
	ctx := context.Background()
	me := &model.User{UserName: "me", Password: "password", Email: "me@example.com"}
	peer := &model.User{UserName: "peer", Password: "password", Email: "peer@example.com"}
	assert.NoError(t, userRepo.Create(ctx, me))
	assert.NoError(t, userRepo.Create(ctx, peer))

	room := &model.Room{
		Name:    "Room",
		ReadSeq: map[string]interface{}{strconv.Itoa(int(me.ID)): 1},
	}
	assert.NoError(t, db.Create(room).Error)
	assert.NoError(t, db.Create(&model.RoomMember{RoomID: room.ID, UserID: me.ID, Role: model.Member}).Error)
	assert.NoError(t, db.Create([]model.Message{
		{Seq: 1, ChannelId: strconv.Itoa(int(room.ID)), UserId: strconv.Itoa(int(me.ID))},
		{Seq: 2, ChannelId: strconv.Itoa(int(room.ID)), UserId: strconv.Itoa(int(peer.ID))},
		{Seq: 3, ChannelId: strconv.Itoa(int(room.ID)), UserId: strconv.Itoa(int(me.ID))},
		{Seq: 4, ChannelId: strconv.Itoa(int(room.ID)), UserId: strconv.Itoa(int(peer.ID))},
	}).Error)

	fetched, err := userRepo.GetProfileByID(ctx, int(me.ID))

	assert.NoError(t, err)
	assert.Len(t, fetched.Rooms, 1)
	assert.Equal(t, int64(2), fetched.Rooms[0].UnreadCount)
}

func TestUserRepository_GetProfileByID_LoadsLastMessageAndSortsRooms(t *testing.T) {
	userRepo, db := setupRepositoryWithDB(t)
	ctx := context.Background()
	me := &model.User{UserName: "me-sort", Password: "password", Email: "me-sort@example.com"}
	assert.NoError(t, userRepo.Create(ctx, me))

	olderRoom := &model.Room{Name: "Older Room"}
	newerRoom := &model.Room{Name: "Newer Room"}
	emptyRoom := &model.Room{Name: "Empty Room"}
	assert.NoError(t, db.Create(olderRoom).Error)
	assert.NoError(t, db.Create(newerRoom).Error)
	assert.NoError(t, db.Create(emptyRoom).Error)
	for _, room := range []*model.Room{olderRoom, newerRoom, emptyRoom} {
		assert.NoError(t, db.Create(&model.RoomMember{RoomID: room.ID, UserID: me.ID, Role: model.Member}).Error)
	}

	olderTime := time.Date(2026, 1, 1, 10, 0, 0, 0, time.UTC)
	newerTime := olderTime.Add(time.Hour)
	assert.NoError(t, db.Create(&model.Message{
		Model:       gorm.Model{CreatedAt: olderTime, UpdatedAt: olderTime},
		Seq:         1,
		ChannelId:   strconv.Itoa(int(olderRoom.ID)),
		RoomId:      strconv.Itoa(int(olderRoom.ID)),
		UserId:      strconv.Itoa(int(me.ID)),
		ContentType: "TEXT_MESSAGE",
		TextMessage: `{"text":"older preview","mention":[]}`,
	}).Error)
	assert.NoError(t, db.Create(&model.Message{
		Model:       gorm.Model{CreatedAt: newerTime, UpdatedAt: newerTime},
		Seq:         1,
		ChannelId:   strconv.Itoa(int(newerRoom.ID)),
		RoomId:      strconv.Itoa(int(newerRoom.ID)),
		UserId:      strconv.Itoa(int(me.ID)),
		ContentType: "TEXT_MESSAGE",
		TextMessage: `{"text":"newer preview","mention":[]}`,
	}).Error)

	fetched, err := userRepo.GetProfileByID(ctx, int(me.ID))

	assert.NoError(t, err)
	assert.Len(t, fetched.Rooms, 3)
	assert.Equal(t, newerRoom.ID, fetched.Rooms[0].ID)
	assert.Equal(t, olderRoom.ID, fetched.Rooms[1].ID)
	assert.Equal(t, emptyRoom.ID, fetched.Rooms[2].ID)
	assert.NotNil(t, fetched.Rooms[0].LastMsg)
	assert.Equal(t, "TEXT_MESSAGE", fetched.Rooms[0].LastMsg.ContentType)
	assert.JSONEq(t, `{"text":"newer preview","mention":[]}`, string(fetched.Rooms[0].LastMsg.TextMessage))

	encodedRoom, err := json.Marshal(fetched.Rooms[0])
	assert.NoError(t, err)
	var roomPayload map[string]interface{}
	assert.NoError(t, json.Unmarshal(encodedRoom, &roomPayload))
	lastMessagePayload := roomPayload["lastMsg"].(map[string]interface{})
	assert.Equal(t, "TEXT_MESSAGE", lastMessagePayload["contentType"])
	assert.Equal(t, "newer preview", lastMessagePayload["textMessage"].(map[string]interface{})["text"])
}

func TestUserRepository_GetByUsername(t *testing.T) {
	userRepo := setupRepository(t)

	ctx := context.Background()
	email := "test@example.com"
	user := &model.User{
		UserName: "test",
		Password: "password",
		Email:    email,
	}
	assert.NoError(t, userRepo.Create(ctx, user))

	fetched, err := userRepo.GetByEmail(ctx, email)
	assert.NoError(t, err)
	assert.NotNil(t, fetched)
	assert.Equal(t, "test@example.com", fetched.Email)
}

func TestUserRepository_UpdateFields(t *testing.T) {
	userRepo := setupRepository(t)

	ctx := context.Background()
	user := &model.User{
		UserName: "test",
		Password: "password",
		Email:    "test@example.com",
	}
	assert.NoError(t, userRepo.Create(ctx, user))

	err := userRepo.UpdateFields(ctx, int(user.ID), map[string]interface{}{
		"username": "updated-name",
		"email":    "updated@example.com",
	})
	assert.NoError(t, err)

	fetched, err := userRepo.GetByID(ctx, int(user.ID))
	assert.NoError(t, err)
	assert.Equal(t, "updated-name", fetched.UserName)
	assert.Equal(t, "updated@example.com", fetched.Email)
}

func TestUserRepository_List(t *testing.T) {
	userRepo := setupRepository(t)

	ctx := context.Background()
	assert.NoError(t, userRepo.Create(ctx, &model.User{UserName: "alice", Password: "password", Email: "alice@example.com"}))
	assert.NoError(t, userRepo.Create(ctx, &model.User{UserName: "bob", Password: "password", Email: "bob@example.com"}))

	users, totalCount, err := userRepo.List(ctx, v1.ListUsersRequest{UserName: "ali"})
	assert.NoError(t, err)
	assert.Equal(t, int64(1), totalCount)
	assert.Len(t, users, 1)
	assert.Equal(t, "alice", users[0].UserName)

	page, totalCount, err := userRepo.List(ctx, v1.ListUsersRequest{PageSize: 1})
	assert.NoError(t, err)
	assert.Equal(t, int64(2), totalCount)
	assert.Len(t, page, 1)
	assert.Equal(t, "alice", page[0].UserName)
}
