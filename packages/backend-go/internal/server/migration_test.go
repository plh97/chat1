package server

import (
	"backend-go/internal/model"
	appLog "backend-go/pkg/log"
	"context"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

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

func TestMigrationResetMustBeExplicit(t *testing.T) {
	conf := viper.New()
	migration := NewMigrate(nil, &appLog.Logger{Logger: zap.NewNop()}, conf)
	require.False(t, migration.reset)

	conf.Set("migration.reset", true)
	migration = NewMigrate(nil, &appLog.Logger{Logger: zap.NewNop()}, conf)
	require.True(t, migration.reset)
}
