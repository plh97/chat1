package repository

import (
	"context"

	"backend-go/internal/model"
)

type MessageRepository interface {
	Create(ctx context.Context, message *model.Message) error
	GetByID(ctx context.Context, id uint) (*model.Message, error)
	GetByChannelID(ctx context.Context, channelID string, limit, offset int) ([]*model.Message, error)
	GetByChannelIDAfterSeq(ctx context.Context, channelID string, seq int) ([]*model.Message, error)
	Update(ctx context.Context, message *model.Message) error
	GetNextSeq(ctx context.Context, channelID string) (int, error)
	GetUnreadCount(ctx context.Context, channelID, userID string, lastReadSeq int) (int64, error)
}

type messageRepository struct {
	*Repository
}

func NewMessageRepository(r *Repository) MessageRepository {
	return &messageRepository{
		Repository: r,
	}
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

// GetNextSeq gets the next sequence number for a channel
func (r *messageRepository) GetNextSeq(ctx context.Context, channelID string) (int, error) {
	var maxSeq struct {
		MaxSeq int
	}
	err := r.DB(ctx).
		Model(&model.Message{}).
		Select("COALESCE(MAX(seq), 0) as max_seq").
		Where("channel_id = ?", channelID).
		Scan(&maxSeq).Error
	if err != nil {
		return 0, err
	}
	return maxSeq.MaxSeq + 1, nil
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
