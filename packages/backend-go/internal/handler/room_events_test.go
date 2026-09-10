package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	v1 "backend-go/api/v1"
	"backend-go/internal/model"
	"backend-go/internal/service"
	appjwt "backend-go/pkg/jwt"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type roomHandlerServiceStub struct {
	service.RoomService
	createRoom func(context.Context, v1.RoomCreateRequest) (*service.RoomCreateResult, error)
	updateRoom func(context.Context, uint, v1.RoomUpdateRequest) (*service.RoomUpdateResult, error)
	joinRoom   func(context.Context, uint, uint) (*service.RoomJoinResult, error)
}

func (s *roomHandlerServiceStub) CreateRoom(ctx context.Context, req v1.RoomCreateRequest) (*service.RoomCreateResult, error) {
	return s.createRoom(ctx, req)
}

func (s *roomHandlerServiceStub) UpdateRoom(ctx context.Context, operatorID uint, req v1.RoomUpdateRequest) (*service.RoomUpdateResult, error) {
	return s.updateRoom(ctx, operatorID, req)
}

func (s *roomHandlerServiceStub) JoinRoom(ctx context.Context, userID, roomID uint) (*service.RoomJoinResult, error) {
	return s.joinRoom(ctx, userID, roomID)
}

type userHandlerServiceStub struct {
	service.UserService
	addFriend func(context.Context, uint, *v1.AddFriendRequest) (*model.Room, error)
}

func (s *userHandlerServiceStub) AddFriend(ctx context.Context, userID uint, req *v1.AddFriendRequest) (*model.Room, error) {
	return s.addFriend(ctx, userID, req)
}

type recordedSystemMessage struct {
	roomID  uint
	actorID uint
	action  string
	content string
}

type recordingRoomEventPublisher struct {
	notifications [][]uint
	messages      []recordedSystemMessage
}

func (p *recordingRoomEventPublisher) NotifyRoomListChanged(userIDs []uint) {
	p.notifications = append(p.notifications, append([]uint(nil), userIDs...))
}

func (p *recordingRoomEventPublisher) PublishSystemMessage(
	_ context.Context,
	roomID, actorUserID uint,
	actionType, content string,
) error {
	p.messages = append(p.messages, recordedSystemMessage{
		roomID:  roomID,
		actorID: actorUserID,
		action:  actionType,
		content: content,
	})
	return nil
}

func handlerJSONContext(t *testing.T, method, target string, body interface{}, userID int) (*gin.Context, *httptest.ResponseRecorder) {
	t.Helper()

	payload, err := json.Marshal(body)
	require.NoError(t, err)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(method, target, bytes.NewReader(payload))
	ctx.Request.Header.Set("Content-Type", "application/json")
	if userID != 0 {
		ctx.Set("claims", &appjwt.MyCustomClaims{UserId: userID})
	}
	return ctx, recorder
}

func TestAddRoomUsesAuthenticatedCreatorAndPublishesRoleEvents(t *testing.T) {
	var captured v1.RoomCreateRequest
	roomService := &roomHandlerServiceStub{
		createRoom: func(_ context.Context, req v1.RoomCreateRequest) (*service.RoomCreateResult, error) {
			captured = req
			return &service.RoomCreateResult{
				Room:        map[string]interface{}{"id": float64(91)},
				RoomID:      91,
				AdminIDs:    []uint{7, 8},
				MemberIDs:   []uint{9, 10},
				RoomUserIDs: []uint{42, 7, 8, 9, 10},
			}, nil
		},
	}
	publisher := &recordingRoomEventPublisher{}
	h := NewRoomHandler(&Handler{}, roomService)
	h.SetRoomEventPublisher(publisher)
	ctx, recorder := handlerJSONContext(t, http.MethodPost, "/room", map[string]interface{}{
		"name":      "test room",
		"creatorId": "999",
		"adminIds":  []string{"7", "8"},
		"memberIds": []string{"9", "10"},
	}, 42)

	h.AddRoom(ctx)

	require.Equal(t, http.StatusOK, recorder.Code)
	assert.Equal(t, uint(42), captured.GetCreatorID(), "request creatorId must not override the JWT user")
	require.Equal(t, [][]uint{{42, 7, 8, 9, 10}}, publisher.notifications)
	require.Len(t, publisher.messages, 3)
	assert.Equal(t, []string{systemActionCreateRoom, systemActionAddAdmin, systemActionAddMember}, []string{
		publisher.messages[0].action,
		publisher.messages[1].action,
		publisher.messages[2].action,
	})
	assert.Equal(t, recordedSystemMessage{91, 42, systemActionCreateRoom, "42 created the room"}, publisher.messages[0])
	assert.Equal(t, recordedSystemMessage{91, 42, systemActionAddAdmin, "42 made 7, 8 a room administrator"}, publisher.messages[1])
	assert.Equal(t, recordedSystemMessage{91, 42, systemActionAddMember, "42 added 9, 10 to the room"}, publisher.messages[2])
}

func TestUpdateRoomPublishesOnlyCommittedChangesAndNotifiesRemovedUsers(t *testing.T) {
	var capturedOperator uint
	roomService := &roomHandlerServiceStub{
		updateRoom: func(_ context.Context, operatorID uint, _ v1.RoomUpdateRequest) (*service.RoomUpdateResult, error) {
			capturedOperator = operatorID
			return &service.RoomUpdateResult{
				Room:             map[string]interface{}{"id": float64(91)},
				AddedMemberIDs:   []uint{12},
				AddedAdminIDs:    []uint{13},
				RemovedMemberIDs: []uint{14},
				RemovedAdminIDs:  []uint{15},
				NewCreatorID:     16,
				MetadataChanged:  true,
				RoomUserIDs:      []uint{42, 12, 13, 15, 16},
			}, nil
		},
	}
	publisher := &recordingRoomEventPublisher{}
	h := NewRoomHandler(&Handler{}, roomService)
	h.SetRoomEventPublisher(publisher)
	ctx, recorder := handlerJSONContext(t, http.MethodPatch, "/room", map[string]interface{}{
		"id":              "91",
		"name":            "renamed",
		"adminIds":        []string{"13", "113"},
		"memberIds":       []string{"12", "112"},
		"removeAdminIds":  []string{"15", "115"},
		"removeMemberIds": []string{"14", "114"},
		"newCreatorId":    "16",
	}, 42)

	h.UpdateRoom(ctx)

	require.Equal(t, http.StatusOK, recorder.Code)
	assert.Equal(t, uint(42), capturedOperator)
	assert.Equal(t, [][]uint{{42, 12, 13, 15, 16, 14}}, publisher.notifications)
	require.Len(t, publisher.messages, 6)
	assert.Equal(t, []string{
		systemActionAddMember,
		systemActionAddAdmin,
		systemActionRemoveMember,
		systemActionRemoveAdmin,
		systemActionTransferOwner,
		systemActionChangeRoom,
	}, []string{
		publisher.messages[0].action,
		publisher.messages[1].action,
		publisher.messages[2].action,
		publisher.messages[3].action,
		publisher.messages[4].action,
		publisher.messages[5].action,
	})

	contents := make([]string, 0, len(publisher.messages))
	for _, message := range publisher.messages {
		assert.Equal(t, uint(91), message.roomID)
		assert.Equal(t, uint(42), message.actorID)
		contents = append(contents, message.content)
	}
	assert.Equal(t, []string{
		"42 added 12 to the room",
		"42 made 13 a room administrator",
		"42 removed 14 from the room",
		"42 removed 15 as room administrator",
		"42 transferred room ownership to 16",
		"42 updated the room information",
	}, contents)
	assert.NotContains(t, contents, "112")
	assert.NotContains(t, contents, "113")
	assert.NotContains(t, contents, "114")
	assert.NotContains(t, contents, "115")
}

func TestUpdateRoomDoesNotPublishNoOpActions(t *testing.T) {
	roomService := &roomHandlerServiceStub{
		updateRoom: func(_ context.Context, _ uint, _ v1.RoomUpdateRequest) (*service.RoomUpdateResult, error) {
			return &service.RoomUpdateResult{
				Room:        map[string]interface{}{"id": float64(91)},
				RoomUserIDs: []uint{42, 12},
			}, nil
		},
	}
	publisher := &recordingRoomEventPublisher{}
	h := NewRoomHandler(&Handler{}, roomService)
	h.SetRoomEventPublisher(publisher)
	ctx, recorder := handlerJSONContext(t, http.MethodPatch, "/room", map[string]interface{}{
		"id":              "91",
		"name":            "unchanged",
		"adminIds":        []string{"12"},
		"removeMemberIds": []string{"99"},
	}, 42)

	h.UpdateRoom(ctx)

	require.Equal(t, http.StatusOK, recorder.Code)
	assert.Empty(t, publisher.messages)
	assert.Equal(t, [][]uint{{42, 12}}, publisher.notifications)
}

func TestJoinRoomPublishesOnlyWhenMembershipWasAdded(t *testing.T) {
	tests := []struct {
		name             string
		added            bool
		expectedMessages int
		expectedNotifies int
	}{
		{name: "new membership", added: true, expectedMessages: 1, expectedNotifies: 1},
		{name: "existing membership", added: false, expectedMessages: 0, expectedNotifies: 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var capturedUserID, capturedRoomID uint
			roomService := &roomHandlerServiceStub{
				joinRoom: func(_ context.Context, userID, roomID uint) (*service.RoomJoinResult, error) {
					capturedUserID, capturedRoomID = userID, roomID
					return &service.RoomJoinResult{
						Room:        map[string]interface{}{"id": float64(roomID)},
						RoomID:      roomID,
						Added:       tt.added,
						RoomUserIDs: []uint{42, 73},
					}, nil
				},
			}
			publisher := &recordingRoomEventPublisher{}
			h := NewRoomHandler(&Handler{}, roomService)
			h.SetRoomEventPublisher(publisher)
			ctx, recorder := handlerJSONContext(t, http.MethodPost, "/joinRoom", map[string]interface{}{"id": 91}, 42)

			h.JoinRoom(ctx)

			require.Equal(t, http.StatusOK, recorder.Code)
			assert.Equal(t, uint(42), capturedUserID)
			assert.Equal(t, uint(91), capturedRoomID)
			assert.Len(t, publisher.messages, tt.expectedMessages)
			assert.Len(t, publisher.notifications, tt.expectedNotifies)
			if tt.added {
				assert.Equal(t, [][]uint{{42, 73}}, publisher.notifications)
				assert.Equal(t, recordedSystemMessage{91, 42, systemActionAddMember, "42 joined the room"}, publisher.messages[0])
			}
		})
	}
}

func TestAddFriendPublishesSystemMessageAndNotifiesBothUsers(t *testing.T) {
	var capturedUserID, capturedFriendID uint
	userService := &userHandlerServiceStub{
		addFriend: func(_ context.Context, userID uint, req *v1.AddFriendRequest) (*model.Room, error) {
			capturedUserID, capturedFriendID = userID, req.GetFriendID()
			return &model.Room{ID: 91}, nil
		},
	}
	publisher := &recordingRoomEventPublisher{}
	h := NewUserHandler(&Handler{}, userService)
	h.SetRoomEventPublisher(publisher)
	ctx, recorder := handlerJSONContext(t, http.MethodPost, "/friend", map[string]interface{}{"id": "73"}, 42)

	h.AddFriend(ctx)

	require.Equal(t, http.StatusOK, recorder.Code)
	assert.Equal(t, uint(42), capturedUserID)
	assert.Equal(t, uint(73), capturedFriendID)
	assert.Equal(t, [][]uint{{42, 73}}, publisher.notifications)
	require.Len(t, publisher.messages, 1)
	assert.Equal(t, recordedSystemMessage{91, 42, systemActionAddFriend, "42 and 73 are now friends"}, publisher.messages[0])
}
