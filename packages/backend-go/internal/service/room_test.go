package service

import (
	v1 "backend-go/api/v1"
	"backend-go/internal/model"
	"backend-go/internal/repository"
	"context"
	"fmt"
	"strings"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

type roomServiceFixture struct {
	db      *gorm.DB
	service RoomService
	roomID  uint
	userIDs []uint
}

func setupRoomServiceFixture(t *testing.T) *roomServiceFixture {
	t.Helper()
	databaseName := strings.NewReplacer("/", "_", " ", "_").Replace(t.Name())
	db, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", databaseName)), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&model.User{}, &model.Room{}, &model.RoomMember{}))

	users := make([]model.User, 6)
	userIDs := make([]uint, 0, len(users))
	for index := range users {
		users[index] = model.User{
			UserName: fmt.Sprintf("room-user-%d-%s", index+1, databaseName),
			Email:    fmt.Sprintf("room-user-%d-%s@example.com", index+1, databaseName),
		}
		require.NoError(t, db.Create(&users[index]).Error)
		userIDs = append(userIDs, users[index].ID)
	}

	room := &model.Room{Name: "Original room", Image: "avatar.png"}
	require.NoError(t, db.Create(room).Error)
	require.NoError(t, db.Create([]model.RoomMember{
		{RoomID: room.ID, UserID: userIDs[0], Role: model.Creator},
		{RoomID: room.ID, UserID: userIDs[1], Role: model.Admin},
		{RoomID: room.ID, UserID: userIDs[2], Role: model.Member},
		{RoomID: room.ID, UserID: userIDs[3], Role: model.Member},
		{RoomID: room.ID, UserID: userIDs[5], Role: model.Member},
	}).Error)

	repo := repository.NewRepository(nil, db)
	return &roomServiceFixture{
		db:      db,
		service: NewRoomService(NewService(repo, nil, nil, nil)),
		roomID:  room.ID,
		userIDs: userIDs,
	}
}

func roomString(value string) *string {
	return &value
}

func roomUserID(value uint) *v1.RoomUserID {
	id := v1.RoomUserID(value)
	return &id
}

func roomRole(t *testing.T, db *gorm.DB, roomID, userID uint) string {
	t.Helper()
	var membership model.RoomMember
	err := db.Where("room_id = ? AND user_id = ?", roomID, userID).First(&membership).Error
	if err != nil {
		return ""
	}
	return membership.Role
}

func TestUpdateRoomRejectsRegularMember(t *testing.T) {
	fixture := setupRoomServiceFixture(t)

	_, err := fixture.service.UpdateRoom(context.Background(), fixture.userIDs[2], v1.RoomUpdateRequest{
		ID:   v1.RoomUserID(fixture.roomID),
		Name: roomString("Hacked room"),
	})
	require.ErrorIs(t, err, ErrRoomForbidden)

	var room model.Room
	require.NoError(t, fixture.db.First(&room, fixture.roomID).Error)
	require.Equal(t, "Original room", room.Name)
}

func TestAuthorizeRoomAccessSeparatesPublicDiscoveryFromMemberData(t *testing.T) {
	fixture := setupRoomServiceFixture(t)
	ctx := context.Background()
	memberID := fixture.userIDs[2]
	outsiderID := fixture.userIDs[4]

	require.NoError(t, fixture.service.AuthorizeRoomAccess(ctx, fixture.roomID, memberID, false))
	require.NoError(t, fixture.service.AuthorizeRoomAccess(ctx, fixture.roomID, outsiderID, true))
	require.ErrorIs(t, fixture.service.AuthorizeRoomAccess(ctx, fixture.roomID, outsiderID, false), ErrRoomForbidden)

	privateRoom := &model.Room{Name: "Private", ChannelType: model.RoomTypePrivate}
	require.NoError(t, fixture.db.Create(privateRoom).Error)
	require.NoError(t, fixture.db.Create(&model.RoomMember{
		RoomID: privateRoom.ID,
		UserID: memberID,
		Role:   model.Member,
	}).Error)
	require.NoError(t, fixture.service.AuthorizeRoomAccess(ctx, privateRoom.ID, memberID, false))
	require.ErrorIs(t, fixture.service.AuthorizeRoomAccess(ctx, privateRoom.ID, outsiderID, true), ErrRoomForbidden)
}

func TestListRoomsExcludesSoftDeletedMemberships(t *testing.T) {
	fixture := setupRoomServiceFixture(t)
	ctx := context.Background()
	userID := fixture.userIDs[4]

	formerRoom := &model.Room{Name: "Former room"}
	require.NoError(t, fixture.db.Create(formerRoom).Error)
	membership := &model.RoomMember{
		RoomID: formerRoom.ID,
		UserID: userID,
		Role:   model.Member,
	}
	require.NoError(t, fixture.db.Create(membership).Error)
	require.NoError(t, fixture.db.Delete(membership).Error)

	result, err := fixture.service.ListRooms(ctx, userID)
	require.NoError(t, err)
	rooms, ok := result.([]model.Room)
	require.True(t, ok)
	require.Empty(t, rooms)

	activeResult, err := fixture.service.ListRooms(ctx, fixture.userIDs[2])
	require.NoError(t, err)
	activeRooms, ok := activeResult.([]model.Room)
	require.True(t, ok)
	require.Len(t, activeRooms, 1)
	require.Equal(t, fixture.roomID, activeRooms[0].ID)
}

func TestUpdateRoomAdminCanManageMetadataAndMembersOnly(t *testing.T) {
	fixture := setupRoomServiceFixture(t)

	result, err := fixture.service.UpdateRoom(context.Background(), fixture.userIDs[1], v1.RoomUpdateRequest{
		ID:              v1.RoomUserID(fixture.roomID),
		Name:            roomString("Renamed room"),
		Image:           roomString(""),
		MemberIDs:       []v1.RoomUserID{v1.RoomUserID(fixture.userIDs[4])},
		RemoveMemberIDs: []v1.RoomUserID{v1.RoomUserID(fixture.userIDs[3])},
	})
	require.NoError(t, err)
	require.True(t, result.MetadataChanged)
	require.Equal(t, []uint{fixture.userIDs[4]}, result.AddedMemberIDs)
	require.Equal(t, []uint{fixture.userIDs[3]}, result.RemovedMemberIDs)
	require.Equal(t, model.Member, roomRole(t, fixture.db, fixture.roomID, fixture.userIDs[4]))
	require.Empty(t, roomRole(t, fixture.db, fixture.roomID, fixture.userIDs[3]))

	var room model.Room
	require.NoError(t, fixture.db.First(&room, fixture.roomID).Error)
	require.Equal(t, "Renamed room", room.Name)
	require.Empty(t, room.Image)

	_, err = fixture.service.UpdateRoom(context.Background(), fixture.userIDs[1], v1.RoomUpdateRequest{
		ID:       v1.RoomUserID(fixture.roomID),
		AdminIDs: []v1.RoomUserID{v1.RoomUserID(fixture.userIDs[4])},
	})
	require.ErrorIs(t, err, ErrRoomForbidden)
	require.Equal(t, model.Member, roomRole(t, fixture.db, fixture.roomID, fixture.userIDs[4]))
}

func TestUpdateRoomCreatorCanManageRolesAndTransferOwnership(t *testing.T) {
	fixture := setupRoomServiceFixture(t)

	result, err := fixture.service.UpdateRoom(context.Background(), fixture.userIDs[0], v1.RoomUpdateRequest{
		ID:              v1.RoomUserID(fixture.roomID),
		NewCreatorID:    roomUserID(fixture.userIDs[2]),
		AdminIDs:        []v1.RoomUserID{v1.RoomUserID(fixture.userIDs[3])},
		MemberIDs:       []v1.RoomUserID{v1.RoomUserID(fixture.userIDs[4])},
		RemoveAdminIDs:  []v1.RoomUserID{v1.RoomUserID(fixture.userIDs[1])},
		RemoveMemberIDs: []v1.RoomUserID{v1.RoomUserID(fixture.userIDs[5])},
	})
	require.NoError(t, err)
	require.Equal(t, []uint{fixture.userIDs[3]}, result.AddedAdminIDs)
	require.Equal(t, []uint{fixture.userIDs[4]}, result.AddedMemberIDs)
	require.Equal(t, []uint{fixture.userIDs[1]}, result.RemovedAdminIDs)
	require.Equal(t, []uint{fixture.userIDs[5]}, result.RemovedMemberIDs)
	require.Equal(t, fixture.userIDs[0], result.PreviousCreatorID)
	require.Equal(t, fixture.userIDs[2], result.NewCreatorID)
	require.ElementsMatch(t, fixture.userIDs[:5], result.RoomUserIDs)

	require.Equal(t, model.Admin, roomRole(t, fixture.db, fixture.roomID, fixture.userIDs[0]))
	require.Equal(t, model.Member, roomRole(t, fixture.db, fixture.roomID, fixture.userIDs[1]))
	require.Equal(t, model.Creator, roomRole(t, fixture.db, fixture.roomID, fixture.userIDs[2]))
	require.Equal(t, model.Admin, roomRole(t, fixture.db, fixture.roomID, fixture.userIDs[3]))
	require.Equal(t, model.Member, roomRole(t, fixture.db, fixture.roomID, fixture.userIDs[4]))
	require.Empty(t, roomRole(t, fixture.db, fixture.roomID, fixture.userIDs[5]))
}

func TestUpdateRoomRollsBackInvalidOwnershipTransfer(t *testing.T) {
	fixture := setupRoomServiceFixture(t)

	_, err := fixture.service.UpdateRoom(context.Background(), fixture.userIDs[0], v1.RoomUpdateRequest{
		ID:           v1.RoomUserID(fixture.roomID),
		Name:         roomString("Must roll back"),
		NewCreatorID: roomUserID(fixture.userIDs[4]),
	})
	require.ErrorIs(t, err, ErrInvalidRoomUpdate)

	var room model.Room
	require.NoError(t, fixture.db.First(&room, fixture.roomID).Error)
	require.Equal(t, "Original room", room.Name)
	require.Equal(t, model.Creator, roomRole(t, fixture.db, fixture.roomID, fixture.userIDs[0]))
	require.Empty(t, roomRole(t, fixture.db, fixture.roomID, fixture.userIDs[4]))
}

func TestJoinRoomReportsActualAdditionAndAllowsRejoin(t *testing.T) {
	fixture := setupRoomServiceFixture(t)
	ctx := context.Background()

	first, err := fixture.service.JoinRoom(ctx, fixture.userIDs[4], 0)
	require.NoError(t, err)
	require.Equal(t, fixture.roomID, first.RoomID)
	require.True(t, first.Added)
	require.ElementsMatch(t, fixture.userIDs, first.RoomUserIDs)

	second, err := fixture.service.JoinRoom(ctx, fixture.userIDs[4], fixture.roomID)
	require.NoError(t, err)
	require.False(t, second.Added)

	_, err = fixture.service.UpdateRoom(ctx, fixture.userIDs[0], v1.RoomUpdateRequest{
		ID:              v1.RoomUserID(fixture.roomID),
		RemoveMemberIDs: []v1.RoomUserID{v1.RoomUserID(fixture.userIDs[4])},
	})
	require.NoError(t, err)

	rejoined, err := fixture.service.JoinRoom(ctx, fixture.userIDs[4], fixture.roomID)
	require.NoError(t, err)
	require.True(t, rejoined.Added)

	var count int64
	require.NoError(t, fixture.db.Model(&model.RoomMember{}).
		Where("room_id = ? AND user_id = ?", fixture.roomID, fixture.userIDs[4]).Count(&count).Error)
	require.Equal(t, int64(1), count)
}

func TestJoinRoomRestoresLegacySoftDeletedMembership(t *testing.T) {
	fixture := setupRoomServiceFixture(t)
	ctx := context.Background()
	userID := fixture.userIDs[5]

	var original model.RoomMember
	require.NoError(t, fixture.db.Where("room_id = ? AND user_id = ?", fixture.roomID, userID).First(&original).Error)
	require.NoError(t, fixture.db.Delete(&original).Error)

	joined, err := fixture.service.JoinRoom(ctx, userID, fixture.roomID)
	require.NoError(t, err)
	require.True(t, joined.Added)
	require.Equal(t, model.Member, roomRole(t, fixture.db, fixture.roomID, userID))

	var allRows int64
	require.NoError(t, fixture.db.Unscoped().Model(&model.RoomMember{}).
		Where("room_id = ? AND user_id = ?", fixture.roomID, userID).Count(&allRows).Error)
	require.Equal(t, int64(1), allRows)
}

func TestJoinRoomDoesNotExposePrivateRooms(t *testing.T) {
	fixture := setupRoomServiceFixture(t)
	privateRoom := &model.Room{Name: "Private", ChannelType: model.RoomTypePrivate}
	require.NoError(t, fixture.db.Create(privateRoom).Error)
	require.NoError(t, fixture.db.Create([]model.RoomMember{
		{RoomID: privateRoom.ID, UserID: fixture.userIDs[0], Role: model.Member},
		{RoomID: privateRoom.ID, UserID: fixture.userIDs[1], Role: model.Member},
	}).Error)

	_, err := fixture.service.JoinRoom(context.Background(), fixture.userIDs[2], privateRoom.ID)
	require.ErrorIs(t, err, ErrRoomForbidden)
	require.Empty(t, roomRole(t, fixture.db, privateRoom.ID, fixture.userIDs[2]))

	joined, err := fixture.service.JoinRoom(context.Background(), fixture.userIDs[0], privateRoom.ID)
	require.NoError(t, err)
	require.False(t, joined.Added)
	require.ElementsMatch(t, []uint{fixture.userIDs[0], fixture.userIDs[1]}, joined.RoomUserIDs)
}

func TestDeleteRoomRequiresCreator(t *testing.T) {
	fixture := setupRoomServiceFixture(t)
	ctx := context.Background()

	_, err := fixture.service.DeleteRoom(ctx, fixture.userIDs[1], fixture.roomID)
	require.ErrorIs(t, err, ErrRoomForbidden)
	result, err := fixture.service.DeleteRoom(ctx, fixture.userIDs[0], fixture.roomID)
	require.NoError(t, err)
	require.ElementsMatch(t, []uint{
		fixture.userIDs[0], fixture.userIDs[1], fixture.userIDs[2], fixture.userIDs[3], fixture.userIDs[5],
	}, result.RoomUserIDs)

	var room model.Room
	require.ErrorIs(t, fixture.db.First(&room, fixture.roomID).Error, gorm.ErrRecordNotFound)
}
