package handler

import (
	v1 "backend-go/api/v1"
	apphandler "backend-go/internal/handler"
	"backend-go/internal/middleware"
	"backend-go/internal/model"
	"bytes"
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type friendDeleteEventPublisher struct {
	notifications [][]uint
}

func (p *friendDeleteEventPublisher) NotifyRoomListChanged(userIDs []uint) {
	p.notifications = append(p.notifications, append([]uint(nil), userIDs...))
}

func (p *friendDeleteEventPublisher) PublishSystemMessage(context.Context, uint, uint, string, string) error {
	return nil
}

func (p *friendDeleteEventPublisher) PublishRecalledMessage(context.Context, uint, uint, *model.Message) error {
	return nil
}

func TestUserHandler_DeleteFriendNotifiesBothUsersAfterSuccess(t *testing.T) {
	var capturedUserID, capturedFriendID uint
	userHandler := apphandler.NewUserHandler(hdl, &stubUserService{
		deleteFriendFn: func(_ context.Context, userID uint, req *v1.DeleteFriendRequest) error {
			capturedUserID = userID
			capturedFriendID = req.GetFriendID()
			return nil
		},
	})
	publisher := &friendDeleteEventPublisher{}
	userHandler.SetRoomEventPublisher(publisher)
	router := newTestRouter()
	router.Use(middleware.StrictAuth(jwt, logger))
	router.DELETE("/friend", userHandler.DeleteFriend)

	req := httptest.NewRequest(http.MethodDelete, "/friend", bytes.NewBufferString(`{"id":"2"}`))
	req.Header.Set("Authorization", "Bearer "+genToken(t))
	req.Header.Set("Content-Type", "application/json")
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)

	require.Equal(t, http.StatusOK, resp.Code)
	assert.Equal(t, uint(userId), capturedUserID)
	assert.Equal(t, uint(2), capturedFriendID)
	assert.Equal(t, [][]uint{{uint(userId), 2}}, publisher.notifications)
}

func TestUserHandler_DeleteFriendDoesNotNotifyAfterFailure(t *testing.T) {
	userHandler := apphandler.NewUserHandler(hdl, &stubUserService{
		deleteFriendFn: func(context.Context, uint, *v1.DeleteFriendRequest) error {
			return errors.New("delete failed")
		},
	})
	publisher := &friendDeleteEventPublisher{}
	userHandler.SetRoomEventPublisher(publisher)
	router := newTestRouter()
	router.Use(middleware.StrictAuth(jwt, logger))
	router.DELETE("/friend", userHandler.DeleteFriend)

	req := httptest.NewRequest(http.MethodDelete, "/friend", bytes.NewBufferString(`{"id":2}`))
	req.Header.Set("Authorization", "Bearer "+genToken(t))
	req.Header.Set("Content-Type", "application/json")
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)

	assert.Equal(t, http.StatusBadRequest, resp.Code)
	assert.Empty(t, publisher.notifications)
}
