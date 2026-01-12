package service

import (
	"context"
	"fmt"

	"backend-go/internal/model"
	"backend-go/internal/repository"
)

type MessageService interface {
	SendMessage(ctx context.Context, message *model.Message) (*model.Message, error)
	GetMessages(ctx context.Context, channelID string, limit, offset int) ([]*model.Message, error)
	MarkAsRead(ctx context.Context, channelID, userID string, seq int) error
	RecallMessage(ctx context.Context, messageID uint, userID string) error
	GetUnreadCount(ctx context.Context, channelID, userID string) (int64, error)
}

type messageService struct {
	*Service
	messageRepo repository.MessageRepository
}

func NewMessageService(
	s *Service,
	messageRepo repository.MessageRepository,
) MessageService {
	return &messageService{
		Service:     s,
		messageRepo: messageRepo,
	}
}

// SendMessage creates and saves a new message
func (s *messageService) SendMessage(ctx context.Context, message *model.Message) (*model.Message, error) {
	// Get next sequence number for this channel
	nextSeq, err := s.messageRepo.GetNextSeq(ctx, message.ChannelId)
	if err != nil {
		return nil, fmt.Errorf("failed to get next sequence: %w", err)
	}

	message.Seq = nextSeq

	// Save message to database
	if err := s.messageRepo.Create(ctx, message); err != nil {
		return nil, fmt.Errorf("failed to create message: %w", err)
	}

	return message, nil
}

// GetMessages retrieves paginated messages for a channel
func (s *messageService) GetMessages(ctx context.Context, channelID string, limit, offset int) ([]*model.Message, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100 // Max limit
	}

	messages, err := s.messageRepo.GetByChannelID(ctx, channelID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get messages: %w", err)
	}

	return messages, nil
}

// MarkAsRead marks messages as read for a user
func (s *messageService) MarkAsRead(ctx context.Context, channelID, userID string, seq int) error {
	// In a real system, you might want to track read status per user
	// This could be stored in a separate table or in the room's readSeq field
	// For now, we just return success
	// TODO: Implement read status tracking
	return nil
}

// RecallMessage marks a message as recalled
func (s *messageService) RecallMessage(ctx context.Context, messageID uint, userID string) error {
	// Get the message to verify ownership
	message, err := s.messageRepo.GetByID(ctx, messageID)
	if err != nil {
		return fmt.Errorf("message not found")
	}

	// Verify the user owns this message
	if message.UserId != userID {
		return fmt.Errorf("not authorized to recall this message")
	}

	// Mark as recalled
	message.IsRecalled = true
	if err := s.messageRepo.Update(ctx, message); err != nil {
		return fmt.Errorf("failed to recall message: %w", err)
	}

	return nil
}

// GetUnreadCount gets the number of unread messages for a user in a channel
func (s *messageService) GetUnreadCount(ctx context.Context, channelID, userID string) (int64, error) {
	// This would need to be implemented with actual read tracking
	// For now, we return 0
	// TODO: Implement unread count calculation
	return 0, nil
}
