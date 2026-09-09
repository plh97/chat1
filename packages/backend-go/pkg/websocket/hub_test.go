package ws

import (
	"encoding/json"
	"testing"
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
