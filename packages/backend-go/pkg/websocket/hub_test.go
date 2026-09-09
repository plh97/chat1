package ws

import (
	"context"
	"encoding/json"
	"testing"

	mockRepository "backend-go/test/mocks/repository"

	"github.com/golang/mock/gomock"
)

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
