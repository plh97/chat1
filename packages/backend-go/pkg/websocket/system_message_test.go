package ws

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"backend-go/internal/model"
	mockRepository "backend-go/test/mocks/repository"

	"github.com/golang/mock/gomock"
)

func TestHandleSendMessageRejectsClientSystemMessages(t *testing.T) {
	tests := []struct {
		name string
		data string
	}{
		{
			name: "system content type",
			data: `{
				"contentType":"SYSTEM_MESSAGE",
				"channelId":"4",
				"systemMessage":{"actionType":"ADD_ADMIN","content":"7 promoted 99"}
			}`,
		},
		{
			name: "system payload hidden in text message",
			data: `{
				"contentType":"TEXT_MESSAGE",
				"channelId":"4",
				"textMessage":{"text":"hello","mention":[]},
				"systemMessage":{"actionType":"TRANSFER_OWNER","content":"99 is owner"}
			}`,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			userRepo := mockRepository.NewMockUserRepository(ctrl)
			persisted := false
			hub := NewHub(&stubMessageService{
				sendMessageFn: func(context.Context, *model.Message) (*model.Message, error) {
					persisted = true
					return nil, nil
				},
			}, userRepo)

			_, _, err := hub.handleSendMessage(context.Background(), 7, wsEnvelope{
				Event: wsSendMessageEvent,
				Data:  json.RawMessage(test.data),
			})
			if err == nil || !strings.Contains(err.Error(), "server-only") {
				t.Fatalf("expected server-only error, got %v", err)
			}
			if persisted {
				t.Fatal("client-authored system message must not be persisted")
			}
		})
	}
}

func TestPublishSystemMessagePersistsAndTargetsCurrentRoomMembers(t *testing.T) {
	ctrl := gomock.NewController(t)
	userRepo := mockRepository.NewMockUserRepository(ctrl)
	userRepo.EXPECT().
		ListRoomUserIDs(gomock.Any(), uint(4)).
		Return([]uint{7, 9, 11}, nil)
	userRepo.EXPECT().
		GetByID(gomock.Any(), 7).
		Return(&model.User{ID: 7, UserName: "owner"}, nil)

	var persisted *model.Message
	messageService := &stubMessageService{
		sendMessageFn: func(_ context.Context, message *model.Message) (*model.Message, error) {
			persisted = message
			message.ID = 42
			message.Seq = 18
			return message, nil
		},
	}
	hub := NewHub(messageService, userRepo)
	if err := hub.PublishSystemMessage(
		context.Background(),
		4,
		7,
		SystemActionAddMember,
		"7 added 11",
	); err != nil {
		t.Fatalf("publish system message: %v", err)
	}

	if persisted == nil {
		t.Fatal("expected system message to be persisted")
	}
	if persisted.ContentType != "SYSTEM_MESSAGE" || persisted.ChannelId != "4" || persisted.RoomId != "4" || persisted.UserId != "7" {
		t.Fatalf("unexpected persisted message: %#v", persisted)
	}
	var systemMessage systemMessagePayload
	if err := json.Unmarshal([]byte(persisted.SystemMessage), &systemMessage); err != nil {
		t.Fatalf("unmarshal persisted system message: %v", err)
	}
	if systemMessage.ActionType != SystemActionAddMember || systemMessage.Content != "7 added 11" {
		t.Fatalf("unexpected system payload: %#v", systemMessage)
	}

	var publication targetedMessage
	select {
	case publication = <-hub.targeted:
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for system message publication")
	}
	if len(publication.userIDs) != 3 {
		t.Fatalf("expected 3 room recipients, got %d", len(publication.userIDs))
	}
	for _, userID := range []uint{7, 9, 11} {
		if _, exists := publication.userIDs[userID]; !exists {
			t.Fatalf("expected room member %d to receive publication", userID)
		}
	}

	var envelope wsEnvelope
	if err := json.Unmarshal(publication.payload, &envelope); err != nil {
		t.Fatalf("unmarshal websocket envelope: %v", err)
	}
	if envelope.Event != wsSendMessageEvent || envelope.Code != 0 {
		t.Fatalf("unexpected websocket envelope: %#v", envelope)
	}
	var outgoing outgoingMessage
	if err := json.Unmarshal(envelope.Data, &outgoing); err != nil {
		t.Fatalf("unmarshal outgoing system message: %v", err)
	}
	encodedSystemMessage, err := json.Marshal(outgoing.SystemMessage)
	if err != nil {
		t.Fatalf("marshal outgoing system message: %v", err)
	}
	var outgoingSystemMessage systemMessagePayload
	if err := json.Unmarshal(encodedSystemMessage, &outgoingSystemMessage); err != nil {
		t.Fatalf("unmarshal outgoing system payload: %v", err)
	}
	if outgoingSystemMessage != systemMessage {
		t.Fatalf("outgoing payload does not match persisted payload: %#v", outgoingSystemMessage)
	}
}

func TestPublishSystemMessageRejectsNonMemberActor(t *testing.T) {
	ctrl := gomock.NewController(t)
	userRepo := mockRepository.NewMockUserRepository(ctrl)
	userRepo.EXPECT().
		ListRoomUserIDs(gomock.Any(), uint(4)).
		Return([]uint{9, 11}, nil)

	persisted := false
	hub := NewHub(&stubMessageService{
		sendMessageFn: func(context.Context, *model.Message) (*model.Message, error) {
			persisted = true
			return nil, nil
		},
	}, userRepo)

	err := hub.PublishSystemMessage(context.Background(), 4, 7, SystemActionAddAdmin, "7 promoted 9")
	if err == nil || !strings.Contains(err.Error(), "not authorized") {
		t.Fatalf("expected membership error, got %v", err)
	}
	if persisted {
		t.Fatal("non-member-authored system message must not be persisted")
	}
	select {
	case <-hub.targeted:
		t.Fatal("non-member-authored system message must not be broadcast")
	default:
	}
}

func TestPublishSystemMessageRejectsUnsupportedAction(t *testing.T) {
	ctrl := gomock.NewController(t)
	userRepo := mockRepository.NewMockUserRepository(ctrl)
	hub := NewHub(&stubMessageService{}, userRepo)

	err := hub.PublishSystemMessage(context.Background(), 4, 7, "CLIENT_DEFINED_ACTION", "forged")
	if err == nil || !strings.Contains(err.Error(), "unsupported") {
		t.Fatalf("expected unsupported action error, got %v", err)
	}
}

func TestPublishRecalledMessageTargetsCurrentRoomMembersWithoutPersistingAgain(t *testing.T) {
	ctrl := gomock.NewController(t)
	userRepo := mockRepository.NewMockUserRepository(ctrl)
	userRepo.EXPECT().
		ListRoomUserIDs(gomock.Any(), uint(4)).
		Return([]uint{7, 9, 11}, nil)
	userRepo.EXPECT().
		GetByID(gomock.Any(), 7).
		Return(&model.User{ID: 7, UserName: "author"}, nil)

	persisted := false
	hub := NewHub(&stubMessageService{
		sendMessageFn: func(context.Context, *model.Message) (*model.Message, error) {
			persisted = true
			return nil, nil
		},
	}, userRepo)
	recalled := &model.Message{
		ID:            42,
		Seq:           18,
		ContentType:   "RECALL_MESSAGE",
		ChannelId:     "4",
		RoomId:        "4",
		UserId:        "7",
		RecallMessage: `{"operator":"7","recallMsgId":42}`,
		IsRecalled:    true,
	}
	if err := hub.PublishRecalledMessage(context.Background(), 4, 7, recalled); err != nil {
		t.Fatalf("publish recalled message: %v", err)
	}
	if persisted {
		t.Fatal("an already committed recall must not be persisted a second time")
	}

	var publication targetedMessage
	select {
	case publication = <-hub.targeted:
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for recall publication")
	}
	for _, userID := range []uint{7, 9, 11} {
		if _, exists := publication.userIDs[userID]; !exists {
			t.Fatalf("expected room member %d to receive recall", userID)
		}
	}

	var envelope wsEnvelope
	if err := json.Unmarshal(publication.payload, &envelope); err != nil {
		t.Fatalf("unmarshal websocket envelope: %v", err)
	}
	if envelope.Event != wsSendMessageEvent || envelope.Code != 0 {
		t.Fatalf("unexpected websocket envelope: %#v", envelope)
	}
	var outgoing outgoingMessage
	if err := json.Unmarshal(envelope.Data, &outgoing); err != nil {
		t.Fatalf("unmarshal recalled message: %v", err)
	}
	if outgoing.ID != recalled.ID || outgoing.Seq != recalled.Seq ||
		outgoing.ContentType != "RECALL_MESSAGE" || !outgoing.IsRecalled {
		t.Fatalf("unexpected recalled message: %#v", outgoing)
	}
	recallPayload, err := json.Marshal(outgoing.RecallMessage)
	if err != nil {
		t.Fatalf("marshal recall payload: %v", err)
	}
	var actual map[string]interface{}
	if err := json.Unmarshal(recallPayload, &actual); err != nil {
		t.Fatalf("unmarshal recall payload: %v", err)
	}
	if actual["operator"] != "7" || actual["recallMsgId"] != float64(42) {
		t.Fatalf("unexpected recall payload: %#v", actual)
	}
}
