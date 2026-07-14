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

func setupRepository(t *testing.T) repository.UserRepository {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open gorm connection: %v", err)
	}
	if err := db.AutoMigrate(&model.User{}, &model.Room{}, &model.RoomMember{}); err != nil {
		t.Fatalf("failed to migrate schema: %v", err)
	}

	repo := repository.NewRepository(logger, db)
	return repository.NewUserRepository(repo)
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

	users, err := userRepo.List(ctx, v1.ListUsersRequest{UserName: "ali"})
	assert.NoError(t, err)
	assert.Len(t, users, 1)
	assert.Equal(t, "alice", users[0].UserName)
}
