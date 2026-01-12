package server

import (
	"backend-go/internal/model"
	"backend-go/pkg/log"
	"backend-go/pkg/sid"
	"context"
	"os"

	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type Migrate struct {
	db  *gorm.DB
	log *log.Logger
	sid *sid.Sid
}

func NewMigrate(db *gorm.DB, log *log.Logger) *Migrate {
	return &Migrate{
		db:  db,
		log: log,
		sid: sid.NewSid(),
	}
}

func (m *Migrate) Start(ctx context.Context) error {

	m.db.Migrator().DropTable(
		&model.User{},
		&model.Room{},
		&model.Message{},
		&model.RoomMember{},
		"user_friends",
	)

	// 2. 自动迁移数据库表结构
	if err := m.db.AutoMigrate(
		&model.User{},
		&model.Room{},
		&model.RoomMember{},
		&model.Message{},
	); err != nil {
		m.log.Error("migrate error", zap.Error(err))
		return err
	}
	m.log.Info("AutoMigrate success")

	// 4. 创建基础用户
	if err := m.createSeedUsers(); err != nil {
		m.log.Error("create seed users error", zap.Error(err))
		return err
	}

	os.Exit(0)
	return nil
}

func (m *Migrate) Stop(ctx context.Context) error {
	m.log.Info("AutoMigrate stop")
	return nil
}

// createSeedUsers 创建基础用户数据
func (m *Migrate) createSeedUsers() error {
	// 检查是否已存在 admin 用户
	var count int64
	m.db.Model(&model.User{}).Where("username = ?", "admin").Count(&count)
	if count == 0 {
		// 生成 UserId
		userId, err := m.sid.GenString()
		if err != nil {
			return err
		}

		// 加密密码
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.DefaultCost)
		if err != nil {
			return err
		}

		adminUser := &model.User{
			UserName:   "admin",
			Email:      "admin@gmail.com",
			Password:   string(hashedPassword),
			Bio:        "系统管理员",
			Permission: "admin",
			Image:      "",
		}
		if err := m.db.Create(adminUser).Error; err != nil {
			return err
		}
		m.log.Info("Created admin user", zap.String("username", "admin"), zap.String("user_id", userId))
	} else {
		m.log.Info("Admin user already exists")
	}

	// 检查是否已存在 dev 用户
	m.db.Model(&model.User{}).Where("username = ?", "dev").Count(&count)
	if count == 0 {
		// 加密密码
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.DefaultCost)
		if err != nil {
			return err
		}

		devUser := &model.User{
			UserName:   "dev",
			Email:      "dev@gmail.com",
			Password:   string(hashedPassword),
			Bio:        "开发者用户",
			Permission: "user",
			Image:      "",
		}
		if err := m.db.Create(devUser).Error; err != nil {
			return err
		}
		m.log.Info("Created dev user", zap.String("username", "dev"))
	} else {
		m.log.Info("Dev user already exists")
	}

	return nil
}
