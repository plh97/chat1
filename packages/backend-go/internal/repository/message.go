package repository

import (
	"context"
	"strconv"

	"backend-go/internal/model"

	"go.uber.org/zap"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type MessageRepository interface {
	Create(ctx context.Context, message *model.Message) error
	GetByID(ctx context.Context, id uint) (*model.Message, error)
	GetByChannelID(ctx context.Context, channelID string, limit, offset int) ([]*model.Message, error)
	GetByChannelIDAfterSeq(ctx context.Context, channelID string, seq int) ([]*model.Message, error)
	Update(ctx context.Context, message *model.Message) error
	ReserveNextSeq(ctx context.Context, roomID uint) (int, error)
	GetUnreadCount(ctx context.Context, channelID, userID string, lastReadSeq int) (int64, error)
}

type messageRepository struct {
	*Repository
}

func NewMessageRepository(r *Repository) MessageRepository {
	if err := ensureMessagePerformanceSchema(r.db); err != nil {
		r.logger.Error("ensure message performance schema failed", zap.Error(err))
	}
	return &messageRepository{
		Repository: r,
	}
}

func ensureMessagePerformanceSchema(db *gorm.DB) error {
	if !db.Migrator().HasColumn(&model.Room{}, "LastSeq") {
		if err := db.Migrator().AddColumn(&model.Room{}, "LastSeq"); err != nil {
			return err
		}
	}

	var rooms []model.Room
	if err := db.Select("id", "last_seq").Find(&rooms).Error; err != nil {
		return err
	}

	for _, room := range rooms {
		if room.LastSeq > 0 {
			continue
		}
		channelID := strconv.Itoa(int(room.ID))
		var maxSeq struct {
			MaxSeq int
		}
		if err := db.Model(&model.Message{}).
			Select("COALESCE(MAX(seq), 0) as max_seq").
			Where("channel_id = ?", channelID).
			Scan(&maxSeq).Error; err != nil {
			return err
		}
		if maxSeq.MaxSeq == 0 {
			continue
		}
		if err := db.Model(&model.Room{}).
			Where("id = ? AND last_seq = 0", room.ID).
			Update("last_seq", maxSeq.MaxSeq).Error; err != nil {
			return err
		}
	}

	return nil
}

// Create creates a new message
func (r *messageRepository) Create(ctx context.Context, message *model.Message) error {
	return r.DB(ctx).Create(message).Error
}

// GetByID gets a message by ID
func (r *messageRepository) GetByID(ctx context.Context, id uint) (*model.Message, error) {
	var message model.Message
	err := r.DB(ctx).Where("id = ?", id).First(&message).Error
	if err != nil {
		return nil, err
	}
	return &message, nil
}

// GetByChannelID gets messages by channel ID with pagination
func (r *messageRepository) GetByChannelID(ctx context.Context, channelID string, limit, offset int) ([]*model.Message, error) {
	var messages []*model.Message
	err := r.DB(ctx).
		Where("channel_id = ?", channelID).
		Order("seq ASC").
		Limit(limit).
		Offset(offset).
		Find(&messages).Error
	if err != nil {
		return nil, err
	}
	return messages, nil
}

// GetByChannelIDAfterSeq gets messages after a specific sequence number
func (r *messageRepository) GetByChannelIDAfterSeq(ctx context.Context, channelID string, seq int) ([]*model.Message, error) {
	var messages []*model.Message
	err := r.DB(ctx).
		Where("channel_id = ? AND seq > ?", channelID, seq).
		Order("seq ASC").
		Find(&messages).Error
	if err != nil {
		return nil, err
	}
	return messages, nil
}

// Update updates a message
func (r *messageRepository) Update(ctx context.Context, message *model.Message) error {
	return r.DB(ctx).Save(message).Error
}

// ReserveNextSeq reserves the next sequence number from the owning room row.
func (r *messageRepository) ReserveNextSeq(ctx context.Context, roomID uint) (int, error) {
	db := r.DB(ctx)
	var room model.Room
	if err := db.Clauses(clause.Locking{Strength: "UPDATE"}).
		Select("id", "last_seq").
		Where("id = ?", roomID).
		First(&room).Error; err != nil {
		return 0, err
	}

	if room.LastSeq == 0 {
		channelID := strconv.Itoa(int(roomID))
		var maxSeq struct {
			MaxSeq int
		}
		if err := db.Model(&model.Message{}).
			Select("COALESCE(MAX(seq), 0) as max_seq").
			Where("channel_id = ?", channelID).
			Scan(&maxSeq).Error; err != nil {
			return 0, err
		}
		if maxSeq.MaxSeq > 0 {
			room.LastSeq = maxSeq.MaxSeq
			if err := db.Model(&model.Room{}).
				Where("id = ?", roomID).
				Update("last_seq", maxSeq.MaxSeq).Error; err != nil {
				return 0, err
			}
		}
	}

	if err := db.Model(&model.Room{}).
		Where("id = ?", roomID).
		UpdateColumn("last_seq", gorm.Expr("last_seq + ?", 1)).Error; err != nil {
		return 0, err
	}

	if err := db.Select("id", "last_seq").Where("id = ?", roomID).Take(&room).Error; err != nil {
		return 0, err
	}

	return room.LastSeq, nil
}

// GetUnreadCount gets the count of unread messages for a user in a channel
func (r *messageRepository) GetUnreadCount(ctx context.Context, channelID, userID string, lastReadSeq int) (int64, error) {
	var count int64
	err := r.DB(ctx).
		Model(&model.Message{}).
		Where("channel_id = ? AND seq > ? AND user_id != ?", channelID, lastReadSeq, userID).
		Count(&count).Error
	if err != nil {
		return 0, err
	}
	return count, nil
}
