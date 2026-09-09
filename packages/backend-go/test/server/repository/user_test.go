package repository

import (
	v1 "backend-go/api/v1"
	"backend-go/internal/model"
	"backend-go/internal/repository"
	"backend-go/pkg/log"
	"context"
	"testing"

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
	if err := db.AutoMigrate(&model.User{}, &model.Room{}, &model.RoomMember{}); err != nil {
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
