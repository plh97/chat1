package server

import (
	"backend-go/internal/model"
	appLog "backend-go/pkg/log"
	"context"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type legacyRoomMember struct {
	gorm.Model
	Role   string
	UserID uint `gorm:"primaryKey"`
	RoomID uint `gorm:"primaryKey"`
}

func (legacyRoomMember) TableName() string {
	return "room_members"
}

func TestMigrationPreservesExistingDataByDefault(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	conf := viper.New()
	migration := NewMigrate(db, &appLog.Logger{Logger: zap.NewNop()}, conf)
	require.NoError(t, migration.Run(context.Background()))

	user := &model.User{UserName: "existing", Email: "existing@example.com"}
	require.NoError(t, db.Create(user).Error)

	require.NoError(t, migration.Run(context.Background()))

	var count int64
	require.NoError(t, db.Model(&model.User{}).Where("id = ?", user.ID).Count(&count).Error)
	require.Equal(t, int64(1), count)
}

func TestMigrationOnlyPromotesSeedAdminAndExpandsDefaultTenant(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	migration := NewMigrate(db, &appLog.Logger{Logger: zap.NewNop()}, viper.New())
	require.NoError(t, migration.Run(context.Background()))
	require.NoError(t, db.Model(&model.Tenant{}).Where("id = ?", 1).Update("member_limit", 10).Error)

	seedAdmin := model.User{
		TenantID: 1, UserName: "admin", Email: "admin@gmail.com", Permission: "admin",
	}
	legacyChatAdmin := model.User{
		TenantID: 1, UserName: "room-admin", Email: "room-admin@example.com", Permission: "admin",
	}
	require.NoError(t, db.Create(&seedAdmin).Error)
	require.NoError(t, db.Create(&legacyChatAdmin).Error)

	require.NoError(t, migration.Run(context.Background()))
	require.NoError(t, db.First(&seedAdmin, seedAdmin.ID).Error)
	require.NoError(t, db.First(&legacyChatAdmin, legacyChatAdmin.ID).Error)
	require.Equal(t, "platform_owner", seedAdmin.Permission)
	require.Equal(t, "admin", legacyChatAdmin.Permission)

	var tenant model.Tenant
	require.NoError(t, db.First(&tenant, 1).Error)
	require.GreaterOrEqual(t, tenant.MemberLimit, 10000)
}

func TestMigrationResetMustBeExplicit(t *testing.T) {
	conf := viper.New()
	migration := NewMigrate(nil, &appLog.Logger{Logger: zap.NewNop()}, conf)
	require.False(t, migration.reset)

	conf.Set("migration.reset", true)
	migration = NewMigrate(nil, &appLog.Logger{Logger: zap.NewNop()}, conf)
	require.True(t, migration.reset)
}

func TestMigrationDeduplicatesRoomMembersBeforeAddingUniqueIndex(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.Migrator().CreateTable(&legacyRoomMember{}))

	deletedAt := gorm.DeletedAt{Time: time.Now().UTC(), Valid: true}
	legacyRows := []legacyRoomMember{
		{Model: gorm.Model{ID: 1}, RoomID: 10, UserID: 20, Role: model.Member},
		{Model: gorm.Model{ID: 2}, RoomID: 10, UserID: 20, Role: model.Admin},
		{Model: gorm.Model{ID: 3, DeletedAt: deletedAt}, RoomID: 10, UserID: 20, Role: model.Creator},
		{Model: gorm.Model{ID: 4}, RoomID: 11, UserID: 21, Role: model.Member},
		{Model: gorm.Model{ID: 5, DeletedAt: deletedAt}, RoomID: 11, UserID: 21, Role: model.Creator},
		{Model: gorm.Model{ID: 6, DeletedAt: deletedAt}, RoomID: 12, UserID: 22, Role: model.Member},
		{Model: gorm.Model{ID: 7, DeletedAt: deletedAt}, RoomID: 12, UserID: 22, Role: model.Creator},
	}
	require.NoError(t, db.Create(&legacyRows).Error)

	migration := NewMigrate(db, &appLog.Logger{Logger: zap.NewNop()}, viper.New())
	require.NoError(t, migration.Run(context.Background()))

	var memberships []model.RoomMember
	require.NoError(t, db.Unscoped().Order("room_id ASC").Find(&memberships).Error)
	require.Len(t, memberships, 3)

	require.Equal(t, uint(2), memberships[0].ID)
	require.Equal(t, model.Admin, memberships[0].Role)
	require.False(t, memberships[0].DeletedAt.Valid)
	require.Equal(t, uint(4), memberships[1].ID)
	require.Equal(t, model.Member, memberships[1].Role)
	require.False(t, memberships[1].DeletedAt.Valid)
	require.Equal(t, uint(7), memberships[2].ID)
	require.Equal(t, model.Creator, memberships[2].Role)
	require.True(t, memberships[2].DeletedAt.Valid)

	require.True(t, db.Migrator().HasIndex(&model.RoomMember{}, "idx_room_members_room_user"))
	err = db.Create(&model.RoomMember{RoomID: 10, UserID: 20, Role: model.Member}).Error
	require.Error(t, err)

	// A second startup is safe and leaves the same canonical rows in place.
	require.NoError(t, migration.Run(context.Background()))
	var count int64
	require.NoError(t, db.Unscoped().Model(&model.RoomMember{}).Count(&count).Error)
	require.Equal(t, int64(3), count)
}
