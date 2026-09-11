package service

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"testing"

	"backend-go/internal/model"
	"backend-go/internal/repository"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

func setupMessageService(t *testing.T) (*gorm.DB, MessageService) {
	t.Helper()
	databaseName := strings.NewReplacer("/", "_", " ", "_").Replace(t.Name())
	db, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", databaseName)), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&model.User{}, &model.Room{}, &model.RoomMember{}, &model.Message{}))
	repo := repository.NewRepository(nil, db)
	return db, NewMessageService(NewService(repo, nil, nil, nil), repository.NewMessageRepository(repo))
}

func TestGetUnreadCountUsesReadSequenceAndTenantScope(t *testing.T) {
	db, messages := setupMessageService(t)
	viewer := &model.User{TenantID: 1, UserName: "viewer", Email: "viewer-unread@example.com"}
	other := &model.User{TenantID: 1, UserName: "other", Email: "other-unread@example.com"}
	require.NoError(t, db.Create([]*model.User{viewer, other}).Error)
	viewerID := strconv.FormatUint(uint64(viewer.ID), 10)
	otherID := strconv.FormatUint(uint64(other.ID), 10)
	room := &model.Room{
		TenantID: 1,
		Name:     "Unread room",
		ReadSeq:  datatypes.JSONMap{viewerID: 2},
	}
	require.NoError(t, db.Create(room).Error)
	require.NoError(t, db.Create(&model.RoomMember{RoomID: room.ID, UserID: viewer.ID, Role: model.Member}).Error)
	channelID := strconv.FormatUint(uint64(room.ID), 10)

	rows := []model.Message{
		{TenantID: 1, Seq: 1, ChannelId: channelID, RoomId: channelID, UserId: otherID, ContentType: "TEXT_MESSAGE", TextMessage: `{"text":"already read"}`},
		{TenantID: 1, Seq: 3, ChannelId: channelID, RoomId: channelID, UserId: viewerID, ContentType: "TEXT_MESSAGE", TextMessage: `{"text":"own message"}`},
		{TenantID: 1, Seq: 4, ChannelId: channelID, RoomId: channelID, UserId: otherID, ContentType: "RECALL_MESSAGE", RecallMessage: `{"operator":"2","recallMsgId":4}`, IsRecalled: true},
		{TenantID: 2, Seq: 5, ChannelId: channelID, RoomId: channelID, UserId: otherID, ContentType: "TEXT_MESSAGE", TextMessage: `{"text":"different tenant"}`},
		{TenantID: 1, Seq: 6, ChannelId: channelID, RoomId: channelID, UserId: otherID, ContentType: "TEXT_MESSAGE", TextMessage: `{"text":"unread"}`},
	}
	require.NoError(t, db.Create(&rows).Error)

	count, err := messages.GetUnreadCount(repository.WithTenantID(context.Background(), 1), channelID, viewerID)
	require.NoError(t, err)
	require.Equal(t, int64(1), count)
}

func TestGetUnreadCountRejectsNonMember(t *testing.T) {
	db, messages := setupMessageService(t)
	viewer := &model.User{TenantID: 1, UserName: "outsider", Email: "outsider-unread@example.com"}
	require.NoError(t, db.Create(viewer).Error)
	room := &model.Room{TenantID: 1, Name: "Private unread data"}
	require.NoError(t, db.Create(room).Error)

	_, err := messages.GetUnreadCount(
		repository.WithTenantID(context.Background(), 1),
		strconv.FormatUint(uint64(room.ID), 10),
		strconv.FormatUint(uint64(viewer.ID), 10),
	)
	require.ErrorContains(t, err, "not authorized")
}

func TestGetUnreadCountRejectsRoomOutsideTenant(t *testing.T) {
	db, messages := setupMessageService(t)
	viewer := &model.User{TenantID: 2, UserName: "tenant-two", Email: "tenant-two-unread@example.com"}
	require.NoError(t, db.Create(viewer).Error)
	room := &model.Room{TenantID: 2, Name: "Tenant two room"}
	require.NoError(t, db.Create(room).Error)
	require.NoError(t, db.Create(&model.RoomMember{RoomID: room.ID, UserID: viewer.ID, Role: model.Member}).Error)

	_, err := messages.GetUnreadCount(
		repository.WithTenantID(context.Background(), 1),
		strconv.FormatUint(uint64(room.ID), 10),
		strconv.FormatUint(uint64(viewer.ID), 10),
	)
	require.ErrorIs(t, err, gorm.ErrRecordNotFound)
}

func TestGetUnreadCountRejectsNonMemberAndCrossTenantRoom(t *testing.T) {
	db, messages := setupMessageService(t)
	member := &model.User{TenantID: 2, UserName: "member", Email: "member-unread@example.com"}
	outsider := &model.User{TenantID: 1, UserName: "outsider", Email: "outsider-unread@example.com"}
	require.NoError(t, db.Create([]*model.User{member, outsider}).Error)
	room := &model.Room{TenantID: 2, Name: "Tenant two"}
	require.NoError(t, db.Create(room).Error)
	require.NoError(t, db.Create(&model.RoomMember{RoomID: room.ID, UserID: member.ID, Role: model.Member}).Error)
	channelID := strconv.FormatUint(uint64(room.ID), 10)

	_, err := messages.GetUnreadCount(
		repository.WithTenantID(context.Background(), 1),
		channelID,
		strconv.FormatUint(uint64(outsider.ID), 10),
	)
	require.ErrorIs(t, err, gorm.ErrRecordNotFound)

	_, err = messages.GetUnreadCount(
		repository.WithTenantID(context.Background(), 2),
		channelID,
		strconv.FormatUint(uint64(outsider.ID), 10),
	)
	require.ErrorContains(t, err, "not authorized")
}
