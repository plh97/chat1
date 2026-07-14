package service

import (
	"context"
	"fmt"
	"strconv"

	"backend-go/internal/model"
	"backend-go/internal/repository"

	"gorm.io/datatypes"
)

type MessageService interface {
	SendMessage(ctx context.Context, message *model.Message) (*model.Message, error)
	GetMessageByID(ctx context.Context, messageID uint) (*model.Message, error)
	GetMessages(ctx context.Context, channelID string, limit, offset int) ([]*model.Message, error)
	MarkAsRead(ctx context.Context, channelID, userID string, seq int) error
	RecallMessage(ctx context.Context, messageID uint, userID string) (*model.Message, error)
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
	roomID, err := strconv.ParseUint(message.ChannelId, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid channel id: %w", err)
	}

	err = s.tm.Transaction(ctx, func(txCtx context.Context) error {
		nextSeq, seqErr := s.messageRepo.ReserveNextSeq(txCtx, uint(roomID))
		if seqErr != nil {
			return fmt.Errorf("failed to reserve next sequence: %w", seqErr)
		}

		message.Seq = nextSeq

		if createErr := s.messageRepo.Create(txCtx, message); createErr != nil {
			return fmt.Errorf("failed to create message: %w", createErr)
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	return message, nil
}

func (s *messageService) GetMessageByID(ctx context.Context, messageID uint) (*model.Message, error) {
	message, err := s.messageRepo.GetByID(ctx, messageID)
	if err != nil {
		return nil, fmt.Errorf("message not found")
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
	if channelID == "" || userID == "" || seq <= 0 {
		return nil
	}

	roomID, err := strconv.ParseUint(channelID, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid channel id: %w", err)
	}

	db := s.tm.(*repository.Repository).DB(ctx)
	var room model.Room
	if err := db.Where("id = ?", uint(roomID)).First(&room).Error; err != nil {
		return err
	}

	readSeq := room.ReadSeq
	if readSeq == nil {
		readSeq = datatypes.JSONMap{}
	}

	currentSeq := 0
	if value, ok := readSeq[userID]; ok {
		switch typed := value.(type) {
		case int:
			currentSeq = typed
		case int32:
			currentSeq = int(typed)
		case int64:
			currentSeq = int(typed)
		case float64:
			currentSeq = int(typed)
		}
	}

	if currentSeq >= seq {
		return nil
	}

	readSeq[userID] = seq
	return db.Model(&room).Update("read_seq", readSeq).Error
}

// RecallMessage marks a message as recalled
func (s *messageService) RecallMessage(ctx context.Context, messageID uint, userID string) (*model.Message, error) {
	// Get the message to verify ownership
	message, err := s.messageRepo.GetByID(ctx, messageID)
	if err != nil {
		return nil, fmt.Errorf("message not found")
	}

	// Verify the user owns this message
	if message.UserId != userID {
		return nil, fmt.Errorf("not authorized to recall this message")
	}

	// Mark as recalled
	message.ContentType = "RECALL_MESSAGE"
	message.TextMessage = ""
	message.MediaMessage = ""
	message.ReadMessage = ""
	message.SystemMessage = ""
	message.RecallMessage = fmt.Sprintf(`{"operator":"%s","recallMsgId":%d}`, userID, message.ID)
	message.IsRecalled = true
	if err := s.messageRepo.Update(ctx, message); err != nil {
		return nil, fmt.Errorf("failed to recall message: %w", err)
	}

	return message, nil
}

// GetUnreadCount gets the number of unread messages for a user in a channel
func (s *messageService) GetUnreadCount(ctx context.Context, channelID, userID string) (int64, error) {
	// This would need to be implemented with actual read tracking
	// For now, we return 0
	// TODO: Implement unread count calculation
	return 0, nil
}
