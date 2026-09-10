package ws

import (
	"context"
	"encoding/json"
	"testing"

	"backend-go/internal/model"
	"backend-go/internal/repository"
	mockRepository "backend-go/test/mocks/repository"

	"github.com/golang/mock/gomock"
)

type profileAudienceRepositoryStub struct {
	repository.UserRepository
	userIDs []uint
	err     error
}

func (s *profileAudienceRepositoryStub) ListProfileAudienceUserIDs(context.Context, uint) ([]uint, error) {
	return s.userIDs, s.err
}

type stubMessageService struct {
	sendMessageFn    func(context.Context, *model.Message) (*model.Message, error)
	getMessageByIDFn func(context.Context, uint) (*model.Message, error)
	markAsReadFn     func(context.Context, string, string, int) error
	recallMessageFn  func(context.Context, uint, string, string) (*model.Message, error)
}

func (s *stubMessageService) SendMessage(ctx context.Context, message *model.Message) (*model.Message, error) {
	if s.sendMessageFn != nil {
		return s.sendMessageFn(ctx, message)
	}
	return message, nil
}

func (s *stubMessageService) GetMessageByID(ctx context.Context, messageID uint) (*model.Message, error) {
	if s.getMessageByIDFn != nil {
		return s.getMessageByIDFn(ctx, messageID)
	}
	return nil, nil
}

func (s *stubMessageService) GetMessages(context.Context, string, int, int) ([]*model.Message, error) {
	return nil, nil
}

func (s *stubMessageService) MarkAsRead(ctx context.Context, channelID, userID string, seq int) error {
	if s.markAsReadFn != nil {
		return s.markAsReadFn(ctx, channelID, userID, seq)
	}
	return nil
}

func (s *stubMessageService) RecallMessage(ctx context.Context, messageID uint, userID, channelID string) (*model.Message, error) {
	if s.recallMessageFn != nil {
		return s.recallMessageFn(ctx, messageID, userID, channelID)
	}
	return nil, nil
}

func (s *stubMessageService) GetUnreadCount(context.Context, string, string) (int64, error) {
	return 0, nil
}

func TestHandleSendMessageUsesAuthenticatedIdentityAndRoomRecipients(t *testing.T) {
	ctrl := gomock.NewController(t)
	userRepo := mockRepository.NewMockUserRepository(ctrl)
	userRepo.EXPECT().
		ListRoomUserIDs(gomock.Any(), uint(4)).
		Return([]uint{7, 9}, nil)
	userRepo.EXPECT().
		GetByID(gomock.Any(), 7).
		Return(&model.User{ID: 7, UserName: "authenticated"}, nil)

	var persisted *model.Message
	messageService := &stubMessageService{
		sendMessageFn: func(_ context.Context, message *model.Message) (*model.Message, error) {
			persisted = message
			message.ID = 12
			message.Seq = 3
			return message, nil
		},
	}
	hub := NewHub(messageService, userRepo)
	envelope := wsEnvelope{
		Event: wsSendMessageEvent,
		Data: json.RawMessage(`{
			"contentType":"TEXT_MESSAGE",
			"channelId":"4",
			"userId":"99",
			"textMessage":{"text":"hello","mention":[]}
		}`),
	}

	response, recipients, err := hub.handleSendMessage(context.Background(), 7, envelope)
	if err != nil {
		t.Fatalf("handle message: %v", err)
	}
	if persisted == nil || persisted.UserId != "7" {
		t.Fatalf("expected authenticated sender 7, got %#v", persisted)
	}
	if _, ok := recipients[7]; !ok {
		t.Fatal("expected sender to receive the room event")
	}
	if _, ok := recipients[9]; !ok {
		t.Fatal("expected room member 9 to receive the room event")
	}
	if _, ok := recipients[99]; ok {
		t.Fatal("spoofed user must not receive the room event")
	}

	var responseEnvelope wsEnvelope
	if err := json.Unmarshal(response, &responseEnvelope); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	var responseMessage outgoingMessage
	if err := json.Unmarshal(responseEnvelope.Data, &responseMessage); err != nil {
		t.Fatalf("unmarshal response message: %v", err)
	}
	if responseMessage.UserID != "7" {
		t.Fatalf("expected response sender 7, got %q", responseMessage.UserID)
	}
}

func TestHandleReadReceiptSanitizesOperatorAndReadMap(t *testing.T) {
	ctrl := gomock.NewController(t)
	userRepo := mockRepository.NewMockUserRepository(ctrl)
	userRepo.EXPECT().
		ListRoomUserIDs(gomock.Any(), uint(4)).
		Return([]uint{7, 9}, nil)

	var markedChannelID, markedUserID string
	var markedSeq int
	messageService := &stubMessageService{
		markAsReadFn: func(_ context.Context, channelID, userID string, seq int) error {
			markedChannelID, markedUserID, markedSeq = channelID, userID, seq
			return nil
		},
	}
	hub := NewHub(messageService, userRepo)
	envelope := wsEnvelope{
		Event: wsSendMessageEvent,
		Data: json.RawMessage(`{
			"contentType":"READ_MESSAGE",
			"channelId":"4",
			"userId":"99",
			"readMessage":{"operator":"99","lastReadSeq":18,"readSeq":{"99":999,"9":999}}
		}`),
	}

	response, _, err := hub.handleSendMessage(context.Background(), 7, envelope)
	if err != nil {
		t.Fatalf("handle read receipt: %v", err)
	}
	if markedChannelID != "4" || markedUserID != "7" || markedSeq != 18 {
		t.Fatalf("unexpected persisted read receipt: channel=%q user=%q seq=%d", markedChannelID, markedUserID, markedSeq)
	}

	var responseEnvelope wsEnvelope
	if err := json.Unmarshal(response, &responseEnvelope); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	var responseMessage struct {
		UserID      string `json:"userId"`
		ReadMessage struct {
			Operator    string         `json:"operator"`
			LastReadSeq int            `json:"lastReadSeq"`
			ReadSeq     map[string]int `json:"readSeq"`
		} `json:"readMessage"`
	}
	if err := json.Unmarshal(responseEnvelope.Data, &responseMessage); err != nil {
		t.Fatalf("unmarshal response message: %v", err)
	}
	if responseMessage.UserID != "7" || responseMessage.ReadMessage.Operator != "7" {
		t.Fatalf("expected authenticated operator 7, got %#v", responseMessage)
	}
	if len(responseMessage.ReadMessage.ReadSeq) != 1 || responseMessage.ReadMessage.ReadSeq["7"] != 18 {
		t.Fatalf("expected sanitized read map, got %#v", responseMessage.ReadMessage.ReadSeq)
	}
}

func TestHandleSendMessageRejectsNonMember(t *testing.T) {
	ctrl := gomock.NewController(t)
	userRepo := mockRepository.NewMockUserRepository(ctrl)
	userRepo.EXPECT().
		ListRoomUserIDs(gomock.Any(), uint(4)).
		Return([]uint{9}, nil)
	hub := NewHub(&stubMessageService{}, userRepo)
	envelope := wsEnvelope{
		Event: wsSendMessageEvent,
		Data:  json.RawMessage(`{"contentType":"TEXT_MESSAGE","channelId":"4","userId":"9"}`),
	}

	if _, _, err := hub.handleSendMessage(context.Background(), 7, envelope); err == nil {
		t.Fatal("expected non-member sender to be rejected")
	}
}

func TestHandleRecallUsesAuthenticatedIdentity(t *testing.T) {
	ctrl := gomock.NewController(t)
	userRepo := mockRepository.NewMockUserRepository(ctrl)
	userRepo.EXPECT().
		ListRoomUserIDs(gomock.Any(), uint(4)).
		Return([]uint{7, 9}, nil)
	userRepo.EXPECT().
		GetByID(gomock.Any(), 7).
		Return(&model.User{ID: 7, UserName: "authenticated"}, nil)

	var recalledUserID, recalledChannelID string
	messageService := &stubMessageService{
		recallMessageFn: func(_ context.Context, messageID uint, userID, channelID string) (*model.Message, error) {
			if messageID != 12 {
				t.Fatalf("expected message 12, got %d", messageID)
			}
			recalledUserID, recalledChannelID = userID, channelID
			return &model.Message{ID: 12, UserId: userID, ChannelId: channelID, RoomId: channelID}, nil
		},
	}
	hub := NewHub(messageService, userRepo)
	envelope := wsEnvelope{
		Event: wsSendMessageEvent,
		Data: json.RawMessage(`{
			"contentType":"RECALL_MESSAGE",
			"channelId":"4",
			"userId":"99",
			"recallMessage":{"operator":"99","recallMsgId":"12"}
		}`),
	}

	if _, _, err := hub.handleSendMessage(context.Background(), 7, envelope); err != nil {
		t.Fatalf("handle recall: %v", err)
	}
	if recalledUserID != "7" || recalledChannelID != "4" {
		t.Fatalf("expected authenticated recall in room 4, got user=%q room=%q", recalledUserID, recalledChannelID)
	}
}

func TestHandleSendMessageRejectsCrossRoomReply(t *testing.T) {
	ctrl := gomock.NewController(t)
	userRepo := mockRepository.NewMockUserRepository(ctrl)
	userRepo.EXPECT().
		ListRoomUserIDs(gomock.Any(), uint(4)).
		Return([]uint{7, 9}, nil)
	messageService := &stubMessageService{
		getMessageByIDFn: func(_ context.Context, messageID uint) (*model.Message, error) {
			return &model.Message{ID: messageID, ChannelId: "5"}, nil
		},
		sendMessageFn: func(_ context.Context, _ *model.Message) (*model.Message, error) {
			t.Fatal("cross-room reply must not be persisted")
			return nil, nil
		},
	}
	hub := NewHub(messageService, userRepo)
	envelope := wsEnvelope{
		Event: wsSendMessageEvent,
		Data: json.RawMessage(`{
			"contentType":"TEXT_MESSAGE",
			"channelId":"4",
			"replyId":"21",
			"textMessage":{"text":"leak reply","mention":[]}
		}`),
	}

	if _, _, err := hub.handleSendMessage(context.Background(), 7, envelope); err == nil {
		t.Fatal("expected cross-room reply to be rejected")
	}
}

func TestDeliverTargetedOnlyWritesToRequestedUsers(t *testing.T) {
	hub := NewHub(nil, nil)
	member := &Client{userID: 7, send: make(chan []byte, 1)}
	memberSecondSession := &Client{userID: 7, send: make(chan []byte, 1)}
	outsider := &Client{userID: 99, send: make(chan []byte, 1)}
	hub.registerClient(member)
	hub.registerClient(memberSecondSession)
	hub.registerClient(outsider)

	payload := []byte("room-only")
	hub.deliverTargeted(targetedMessage{
		userIDs: map[uint]struct{}{7: {}},
		payload: payload,
	})

	for _, client := range []*Client{member, memberSecondSession} {
		select {
		case received := <-client.send:
			if string(received) != string(payload) {
				t.Fatalf("unexpected payload %q", received)
			}
		default:
			t.Fatal("expected every member session to receive the event")
		}
	}
	select {
	case <-outsider.send:
		t.Fatal("outsider must not receive a room event")
	default:
	}
}

func TestNotifyRoomListChangedTargetsOnlyRequestedUsers(t *testing.T) {
	hub := NewHub(nil, nil)
	hub.NotifyRoomListChanged([]uint{1, 2, 2, 0})

	notification := <-hub.targeted
	if len(notification.userIDs) != 2 {
		t.Fatalf("expected 2 unique targets, got %d", len(notification.userIDs))
	}
	if _, ok := notification.userIDs[1]; !ok {
		t.Fatal("expected user 1 to receive the notification")
	}
	if _, ok := notification.userIDs[2]; !ok {
		t.Fatal("expected user 2 to receive the notification")
	}

	var envelope wsEnvelope
	if err := json.Unmarshal(notification.payload, &envelope); err != nil {
		t.Fatalf("unmarshal notification: %v", err)
	}
	if envelope.Event != wsRoomListChangedEvent {
		t.Fatalf("expected %q event, got %q", wsRoomListChangedEvent, envelope.Event)
	}
}

func TestNotifyUserUpdatedTargetsOnlySharedRoomUsersWithPublicFields(t *testing.T) {
	repo := &profileAudienceRepositoryStub{userIDs: []uint{2, 2, 0}}
	hub := NewHub(nil, repo)
	hub.NotifyUserUpdated(context.Background(), 1, "New name", "new.png")

	notification := <-hub.targeted
	if len(notification.userIDs) != 2 {
		t.Fatalf("expected editor and one peer, got %d targets", len(notification.userIDs))
	}
	if _, ok := notification.userIDs[1]; !ok {
		t.Fatal("expected every editor session to receive the profile update")
	}
	if _, ok := notification.userIDs[2]; !ok {
		t.Fatal("expected the shared-room peer to receive the profile update")
	}

	var envelope wsEnvelope
	if err := json.Unmarshal(notification.payload, &envelope); err != nil {
		t.Fatalf("unmarshal notification: %v", err)
	}
	if envelope.Event != wsUserUpdatedEvent {
		t.Fatalf("expected %q event, got %q", wsUserUpdatedEvent, envelope.Event)
	}
	var profile map[string]interface{}
	if err := json.Unmarshal(envelope.Data, &profile); err != nil {
		t.Fatalf("unmarshal profile: %v", err)
	}
	if len(profile) != 3 || profile["id"] != "1" || profile["userName"] != "New name" || profile["image"] != "new.png" {
		t.Fatalf("unexpected public profile payload: %#v", profile)
	}
	for _, privateField := range []string{"email", "bio", "permission", "password"} {
		if _, exists := profile[privateField]; exists {
			t.Fatalf("private field %q must not be broadcast", privateField)
		}
	}
}

func TestHandleCallSignalTargetsRoomPeerAndStampsCaller(t *testing.T) {
	ctrl := gomock.NewController(t)
	userRepo := mockRepository.NewMockUserRepository(ctrl)
	userRepo.EXPECT().
		AreUsersInRoom(gomock.Any(), uint(4), []uint{7, 9}).
		Return(true, nil)
	hub := NewHub(nil, userRepo)
	envelope := wsEnvelope{
		Event:     wsCallSignalEvent,
		RequestID: "request-1",
		Data: json.RawMessage(`{
			"callId":"call-1",
			"roomId":"4",
			"fromUserId":"spoofed",
			"toUserId":"9",
			"type":"offer",
			"mediaType":"video",
			"sdp":{"type":"offer","sdp":"test"}
		}`),
	}

	response, targetUserID, err := hub.handleCallSignal(context.Background(), 7, envelope)
	if err != nil {
		t.Fatalf("handle call signal: %v", err)
	}
	if targetUserID != 9 {
		t.Fatalf("expected target user 9, got %d", targetUserID)
	}

	var responseEnvelope wsEnvelope
	if err := json.Unmarshal(response, &responseEnvelope); err != nil {
		t.Fatalf("unmarshal response envelope: %v", err)
	}
	var signal callSignal
	if err := json.Unmarshal(responseEnvelope.Data, &signal); err != nil {
		t.Fatalf("unmarshal call signal: %v", err)
	}
	if signal.FromUserID != "7" {
		t.Fatalf("expected authenticated caller 7, got %q", signal.FromUserID)
	}
	if rawMessageToScalarString(signal.RoomID) != "4" {
		t.Fatalf("expected room 4, got %s", signal.RoomID)
	}
}

func TestHandleCallSignalRejectsNonMembers(t *testing.T) {
	ctrl := gomock.NewController(t)
	userRepo := mockRepository.NewMockUserRepository(ctrl)
	userRepo.EXPECT().
		AreUsersInRoom(gomock.Any(), uint(4), []uint{7, 9}).
		Return(false, nil)
	hub := NewHub(nil, userRepo)
	envelope := wsEnvelope{
		Event: wsCallSignalEvent,
		Data: json.RawMessage(`{
			"callId":"call-1",
			"roomId":"4",
			"toUserId":"9",
			"type":"hangup",
			"mediaType":"audio"
		}`),
	}

	if _, _, err := hub.handleCallSignal(context.Background(), 7, envelope); err == nil {
		t.Fatal("expected non-member call signal to be rejected")
	}
}
