package repository

import (
	"backend-go/internal/model"
	apprepo "backend-go/internal/repository"
	"context"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupFriendRepository(t *testing.T) (apprepo.FriendRepository, *gorm.DB) {
	t.Helper()

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&model.User{}, &model.Room{}, &model.RoomMember{}))

	repo := apprepo.NewRepository(logger, db)
	return apprepo.NewFriendRepository(repo), db
}

func createFriendTestRoom(t *testing.T, db *gorm.DB, channelType string, userIDs ...uint) *model.Room {
	t.Helper()

	room := &model.Room{Name: "test room", ChannelType: channelType}
	require.NoError(t, db.Create(room).Error)
	memberships := make([]model.RoomMember, 0, len(userIDs))
	for _, userID := range userIDs {
		memberships = append(memberships, model.RoomMember{
			RoomID: room.ID,
			UserID: userID,
			Role:   model.Member,
		})
	}
	require.NoError(t, db.Create(&memberships).Error)
	return room
}

func addBidirectionalFriendship(t *testing.T, db *gorm.DB, user, friend *model.User) {
	t.Helper()
	require.NoError(t, db.Model(user).Association("Friends").Append(friend))
	require.NoError(t, db.Model(friend).Association("Friends").Append(user))
}

func TestFriendRepository_DeleteFriendDeletesOnlyTwoPersonPrivateRooms(t *testing.T) {
	friendRepo, db := setupFriendRepository(t)
	ctx := context.Background()

	user := &model.User{UserName: "friend-delete-user", Email: "friend-delete-user@example.com"}
	friend := &model.User{UserName: "friend-delete-peer", Email: "friend-delete-peer@example.com"}
	third := &model.User{UserName: "friend-delete-third", Email: "friend-delete-third@example.com"}
	require.NoError(t, db.Create([]*model.User{user, friend, third}).Error)
	addBidirectionalFriendship(t, db, user, friend)

	privateRoom := createFriendTestRoom(t, db, model.RoomTypePrivate, user.ID, friend.ID)
	duplicatePrivateRoom := createFriendTestRoom(t, db, model.RoomTypePrivate, user.ID, friend.ID)
	groupRoom := createFriendTestRoom(t, db, model.RoomTypeGroup, user.ID, friend.ID)
	threePersonPrivateRoom := createFriendTestRoom(t, db, model.RoomTypePrivate, user.ID, friend.ID, third.ID)
	otherPrivateRoom := createFriendTestRoom(t, db, model.RoomTypePrivate, user.ID, third.ID)

	require.NoError(t, friendRepo.DeleteFriend(ctx, user.ID, friend.ID))

	var friendshipCount int64
	require.NoError(t, db.Table("user_friends").
		Where("(user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)", user.ID, friend.ID, friend.ID, user.ID).
		Count(&friendshipCount).Error)
	assert.Zero(t, friendshipCount)

	for _, deletedRoom := range []*model.Room{privateRoom, duplicatePrivateRoom} {
		assert.ErrorIs(t, db.First(&model.Room{}, deletedRoom.ID).Error, gorm.ErrRecordNotFound)

		var membershipCount int64
		require.NoError(t, db.Unscoped().Model(&model.RoomMember{}).
			Where("room_id = ?", deletedRoom.ID).
			Count(&membershipCount).Error)
		assert.Zero(t, membershipCount, "deleted private rooms must not leave room_members rows")
	}

	for _, preservedRoom := range []*model.Room{groupRoom, threePersonPrivateRoom, otherPrivateRoom} {
		var room model.Room
		require.NoError(t, db.First(&room, preservedRoom.ID).Error)
	}
}

func TestFriendRepository_DeleteFriendRollsBackOnRoomCleanupFailure(t *testing.T) {
	friendRepo, db := setupFriendRepository(t)
	ctx := context.Background()

	user := &model.User{UserName: "friend-rollback-user", Email: "friend-rollback-user@example.com"}
	friend := &model.User{UserName: "friend-rollback-peer", Email: "friend-rollback-peer@example.com"}
	require.NoError(t, db.Create([]*model.User{user, friend}).Error)
	addBidirectionalFriendship(t, db, user, friend)
	privateRoom := createFriendTestRoom(t, db, model.RoomTypePrivate, user.ID, friend.ID)

	require.NoError(t, db.Exec(`
		CREATE TRIGGER fail_room_members_delete
		BEFORE DELETE ON room_members
		BEGIN
			SELECT RAISE(ABORT, 'forced room member delete failure');
		END
	`).Error)

	err := friendRepo.DeleteFriend(ctx, user.ID, friend.ID)
	require.Error(t, err)

	var friendshipCount int64
	require.NoError(t, db.Table("user_friends").
		Where("(user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)", user.ID, friend.ID, friend.ID, user.ID).
		Count(&friendshipCount).Error)
	assert.Equal(t, int64(2), friendshipCount, "friend deletions must roll back with room cleanup")

	var room model.Room
	require.NoError(t, db.First(&room, privateRoom.ID).Error)
	var membershipCount int64
	require.NoError(t, db.Model(&model.RoomMember{}).Where("room_id = ?", privateRoom.ID).Count(&membershipCount).Error)
	assert.Equal(t, int64(2), membershipCount)
}
