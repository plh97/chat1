package repository

import (
	"context"
	"strconv"
	"testing"

	"backend-go/internal/model"
	apprepo "backend-go/internal/repository"

	"github.com/stretchr/testify/require"
)

func seedUnreadMessages(t *testing.T, dbRows func(interface{}) error, tenantID uint, channelID, viewerID, otherID string) {
	t.Helper()
	rows := []model.Message{
		{TenantID: tenantID, Seq: 1, ChannelId: channelID, RoomId: channelID, UserId: viewerID, ContentType: "TEXT_MESSAGE", TextMessage: `{"text":"mine"}`},
		{TenantID: tenantID, Seq: 2, ChannelId: channelID, RoomId: channelID, UserId: otherID, ContentType: "RECALL_MESSAGE", RecallMessage: `{"operator":"2","recallMsgId":2}`, IsRecalled: true},
		{TenantID: tenantID, Seq: 3, ChannelId: channelID, RoomId: channelID, UserId: otherID, ContentType: "TEXT_MESSAGE", TextMessage: `{"text":"count me"}`},
		{TenantID: tenantID + 1, Seq: 4, ChannelId: channelID, RoomId: channelID, UserId: otherID, ContentType: "TEXT_MESSAGE", TextMessage: `{"text":"other tenant"}`},
	}
	require.NoError(t, dbRows(&rows))
}

func TestMessageRepositoryGetUnreadCountExcludesOwnRecalledAndOtherTenantMessages(t *testing.T) {
	_, db := setupRepositoryWithDB(t)
	base := apprepo.NewRepository(nil, db)
	messages := apprepo.NewMessageRepository(base)
	viewerID, otherID, channelID := "11", "12", "91"
	seedUnreadMessages(t, func(rows interface{}) error { return db.Create(rows).Error }, 1, channelID, viewerID, otherID)

	count, err := messages.GetUnreadCount(
		apprepo.WithTenantID(context.Background(), 1),
		channelID,
		viewerID,
		0,
	)
	require.NoError(t, err)
	require.Equal(t, int64(1), count)
}

func TestRoomListUnreadBadgeUsesSameTenantSafeRules(t *testing.T) {
	users, db := setupRepositoryWithDB(t)
	viewer := &model.User{TenantID: 1, UserName: "badge-viewer", Email: "badge-viewer@example.com"}
	other := &model.User{TenantID: 1, UserName: "badge-other", Email: "badge-other@example.com"}
	require.NoError(t, db.Create([]*model.User{viewer, other}).Error)
	room := &model.Room{TenantID: 1, Name: "Badge room"}
	require.NoError(t, db.Create(room).Error)
	require.NoError(t, db.Create(&model.RoomMember{RoomID: room.ID, UserID: viewer.ID, Role: model.Member}).Error)
	channelID := strconv.FormatUint(uint64(room.ID), 10)
	viewerID := strconv.FormatUint(uint64(viewer.ID), 10)
	otherID := strconv.FormatUint(uint64(other.ID), 10)
	seedUnreadMessages(t, func(rows interface{}) error { return db.Create(rows).Error }, 1, channelID, viewerID, otherID)

	profile, err := users.GetProfileByID(apprepo.WithTenantID(context.Background(), 1), int(viewer.ID))
	require.NoError(t, err)
	require.Len(t, profile.Rooms, 1)
	require.Equal(t, int64(1), profile.Rooms[0].UnreadCount)
}
