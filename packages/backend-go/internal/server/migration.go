package server

import (
	"backend-go/internal/model"
	"backend-go/pkg/log"
	"backend-go/pkg/sid"
	"context"
	"fmt"
	"os"
	"strconv"

	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const (
	seedFakeUserCount       = 4000
	seedFakeUserBatchSize   = 200
	seedRoomMemberBatchSize = 1000
	seedMessageCount        = 1000000
	seedMessageBatchSize    = 1000
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

	fakeUsers, err := m.createFakeUsers(seedFakeUserCount)
	if err != nil {
		m.log.Error("create fake users error", zap.Error(err))
		return err
	}

	if err := m.createSeedRooms(fakeUsers); err != nil {
		m.log.Error("create seed rooms error", zap.Error(err))
		return err
	}

	os.Exit(0)
	return nil
}

func (m *Migrate) createFakeUsers(total int) ([]model.User, error) {
	var count int64
	m.db.Model(&model.User{}).Where("username LIKE ?", "fake-%").Count(&count)
	if count >= int64(total) {
		var existing []model.User
		if err := m.db.Where("username LIKE ?", "fake-%").Order("id ASC").Find(&existing).Error; err != nil {
			return nil, err
		}
		m.log.Info("Fake users already exist", zap.Int64("count", count))
		return existing, nil
	}

	for start := 1; start <= total; start += seedFakeUserBatchSize {
		end := start + seedFakeUserBatchSize - 1
		if end > total {
			end = total
		}

		users := make([]model.User, 0, end-start+1)
		for i := start; i <= end; i++ {
			username := fmt.Sprintf("fake-%d", i)
			hashedPassword, err := bcrypt.GenerateFromPassword([]byte(username), bcrypt.MinCost)
			if err != nil {
				return nil, err
			}
			users = append(users, model.User{
				UserName:   username,
				Email:      fmt.Sprintf("%s@example.com", username),
				Password:   string(hashedPassword),
				Bio:        "Seed fake user",
				Permission: "user",
				Image:      "",
			})
		}

		if err := m.db.Create(&users).Error; err != nil {
			return nil, err
		}
		m.log.Info("Created fake user batch", zap.Int("start", start), zap.Int("end", end))
	}

	var fakeUsers []model.User
	if err := m.db.Where("username LIKE ?", "fake-%").Order("id ASC").Find(&fakeUsers).Error; err != nil {
		return nil, err
	}
	return fakeUsers, nil
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

// createSeedRooms 创建基础房间数据
func (m *Migrate) createSeedRooms(fakeUsers []model.User) error {
	var count int64
	m.db.Model(&model.Room{}).Where("name = ?", "Common Room").Count(&count)
	if count > 0 {
		m.log.Info("Default room already exists", zap.String("name", "Common Room"))
		var defaultRoom model.Room
		if err := m.db.Where("name = ?", "Common Room").First(&defaultRoom).Error; err != nil {
			return err
		}
		return m.createSeedMessages(&defaultRoom, fakeUsers)
	}

	if len(fakeUsers) == 0 {
		return fmt.Errorf("no fake users available for default room seed")
	}

	var adminUser model.User
	if err := m.db.Where("username = ?", "admin").First(&adminUser).Error; err != nil {
		return err
	}

	defaultRoom := &model.Room{
		Name:        "Common Room",
		ChannelType: model.RoomTypeGroup,
		LastSeq:     seedMessageCount,
	}
	if err := m.db.Create(defaultRoom).Error; err != nil {
		return err
	}

	members := make([]model.RoomMember, 0, len(fakeUsers)+2)
	members = append(members, model.RoomMember{
		RoomID: defaultRoom.ID,
		UserID: adminUser.ID,
		Role:   model.Creator,
	})

	var devUser model.User
	if err := m.db.Where("username = ?", "dev").First(&devUser).Error; err == nil {
		members = append(members, model.RoomMember{
			RoomID: defaultRoom.ID,
			UserID: devUser.ID,
			Role:   model.Member,
		})
	}

	for _, fakeUser := range fakeUsers {
		members = append(members, model.RoomMember{
			RoomID: defaultRoom.ID,
			UserID: fakeUser.ID,
			Role:   model.Member,
		})
	}

	for start := 0; start < len(members); start += seedRoomMemberBatchSize {
		end := start + seedRoomMemberBatchSize
		if end > len(members) {
			end = len(members)
		}
		batch := members[start:end]
		if err := m.db.Create(&batch).Error; err != nil {
			return err
		}
	}

	m.log.Info("Created default room", zap.String("name", defaultRoom.Name), zap.Int("memberCount", len(members)))
	return m.createSeedMessages(defaultRoom, fakeUsers)
}

func (m *Migrate) createSeedMessages(room *model.Room, fakeUsers []model.User) error {
	if room == nil {
		return fmt.Errorf("room is required")
	}
	if len(fakeUsers) == 0 {
		return fmt.Errorf("fake users are required for seed messages")
	}

	channelID := strconv.Itoa(int(room.ID))
	var count int64
	if err := m.db.Model(&model.Message{}).Where("channel_id = ?", channelID).Count(&count).Error; err != nil {
		return err
	}
	if count >= seedMessageCount {
		if room.LastSeq < seedMessageCount {
			if err := m.db.Model(room).Update("last_seq", seedMessageCount).Error; err != nil {
				return err
			}
		}
		m.log.Info("Seed messages already exist", zap.Int64("count", count), zap.String("channelId", channelID))
		return nil
	}

	for startSeq := 1; startSeq <= seedMessageCount; startSeq += seedMessageBatchSize {
		endSeq := startSeq + seedMessageBatchSize - 1
		if endSeq > seedMessageCount {
			endSeq = seedMessageCount
		}

		messages := make([]model.Message, 0, endSeq-startSeq+1)
		for seq := startSeq; seq <= endSeq; seq++ {
			user := fakeUsers[(seq-1)%len(fakeUsers)]
			messages = append(messages, model.Message{
				Seq:         seq,
				ContentType: "TEXT_MESSAGE",
				ChannelId:   channelID,
				RoomId:      channelID,
				TextMessage: fmt.Sprintf(`{"text":"seed message %d from %s","mention":[]}`, seq, user.UserName),
				UserId:      strconv.Itoa(int(user.ID)),
			})
		}

		if err := m.db.Create(&messages).Error; err != nil {
			return err
		}

		if startSeq == 1 || endSeq == seedMessageCount || endSeq%(seedMessageBatchSize*50) == 0 {
			m.log.Info("Created seed message batch", zap.Int("startSeq", startSeq), zap.Int("endSeq", endSeq))
		}
	}

	if err := m.db.Model(room).Update("last_seq", seedMessageCount).Error; err != nil {
		return err
	}

	return nil
}
