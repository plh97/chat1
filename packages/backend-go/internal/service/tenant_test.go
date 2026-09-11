package service

import (
	v1 "backend-go/api/v1"
	"backend-go/internal/model"
	"backend-go/internal/repository"
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func TestUserJSONNeverExposesPasswordHash(t *testing.T) {
	payload, err := json.Marshal(model.User{UserName: "member", Password: "$2a$10$secret-hash"})
	require.NoError(t, err)
	require.NotContains(t, string(payload), "password")
	require.NotContains(t, string(payload), "secret-hash")
}

func setupTenantService(t *testing.T) (*gorm.DB, TenantService) {
	t.Helper()
	databaseName := strings.NewReplacer("/", "_", " ", "_").Replace(t.Name())
	db, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", databaseName)), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&model.Tenant{}, &model.User{}, &model.Room{}, &model.RoomMember{}, &model.Message{}))
	repo := repository.NewRepository(nil, db)
	base := NewService(repo, nil, nil, nil)
	return db, NewTenantService(base)
}

func TestCreateTenantProvisionsOwnerAndDefaultRoom(t *testing.T) {
	db, tenants := setupTenantService(t)
	created, err := tenants.Create(context.Background(), v1.CreateTenantRequest{
		Name: "Acme", Slug: "acme", OwnerEmail: "owner@acme.test",
		OwnerPassword: "secure-pass", Plan: "pro", TrialDays: 7,
	})
	require.NoError(t, err)
	require.Equal(t, "acme", created.Slug)
	require.Equal(t, int64(1), created.MemberCount)
	require.Equal(t, int64(1), created.RoomCount)

	var owner model.User
	require.NoError(t, db.First(&owner, created.OwnerUserID).Error)
	require.Equal(t, created.ID, owner.TenantID)
	require.Equal(t, "tenant_owner", owner.Permission)
	require.NoError(t, bcrypt.CompareHashAndPassword([]byte(owner.Password), []byte("secure-pass")))

	var room model.Room
	require.NoError(t, db.Where("tenant_id = ?", created.ID).First(&room).Error)
	require.Equal(t, "General", room.Name)
	var membership model.RoomMember
	require.NoError(t, db.Where("room_id = ? AND user_id = ?", room.ID, owner.ID).First(&membership).Error)
	require.Equal(t, model.Creator, membership.Role)
}

func TestCreateTenantRollsBackDuplicateOwnerEmail(t *testing.T) {
	db, tenants := setupTenantService(t)
	request := v1.CreateTenantRequest{Name: "One", Slug: "one", OwnerEmail: "same@test.local", OwnerPassword: "secure-pass", Plan: "starter"}
	_, err := tenants.Create(context.Background(), request)
	require.NoError(t, err)
	request.Name, request.Slug = "Two", "two"
	_, err = tenants.Create(context.Background(), request)
	require.ErrorIs(t, err, ErrTenantConflict)
	var count int64
	require.NoError(t, db.Model(&model.Tenant{}).Count(&count).Error)
	require.Equal(t, int64(1), count)
}

func TestPlatformUserLifecycleStaysInsideTenant(t *testing.T) {
	db, tenants := setupTenantService(t)
	tenant, err := tenants.Create(context.Background(), v1.CreateTenantRequest{
		Name: "Team", Slug: "team", OwnerEmail: "owner@team.test",
		OwnerPassword: "secure-pass", Plan: "starter",
	})
	require.NoError(t, err)
	var general model.Room
	require.NoError(t, db.Where("tenant_id = ? AND channel_type = ?", tenant.ID, model.RoomTypeGroup).First(&general).Error)
	require.NoError(t, db.Model(&general).Update("name", "Town Square").Error)

	member, err := tenants.CreateUser(context.Background(), tenant.ID, v1.CreateTenantUserRequest{
		Email: "member@team.test", Password: "member-pass", UserName: "Member", Role: "member",
	})
	require.NoError(t, err)
	require.Equal(t, tenant.ID, member.TenantID)
	require.Equal(t, "active", member.Status)

	var membership model.RoomMember
	require.NoError(t, db.Where("room_id = ? AND user_id = ?", general.ID, member.ID).First(&membership).Error)

	suspended := "suspended"
	updated, err := tenants.UpdateUser(context.Background(), member.ID, v1.UpdateTenantUserRequest{Status: &suspended})
	require.NoError(t, err)
	require.Equal(t, "suspended", updated.Status)
	privateRoom := model.Room{TenantID: tenant.ID, Name: "Private", ChannelType: model.RoomTypePrivate}
	require.NoError(t, db.Create(&privateRoom).Error)
	require.NoError(t, db.Create(&[]model.RoomMember{
		{RoomID: privateRoom.ID, UserID: tenant.OwnerUserID, Role: model.Member},
		{RoomID: privateRoom.ID, UserID: member.ID, Role: model.Member},
	}).Error)
	require.NoError(t, db.Exec(
		"INSERT INTO user_friends (user_id, friend_id) VALUES (?, ?), (?, ?)",
		tenant.OwnerUserID, member.ID, member.ID, tenant.OwnerUserID,
	).Error)

	require.NoError(t, tenants.DeleteUser(context.Background(), member.ID))
	var privateRoomCount int64
	require.NoError(t, db.Model(&model.Room{}).Where("id = ?", privateRoom.ID).Count(&privateRoomCount).Error)
	require.Zero(t, privateRoomCount)
	var friendshipCount int64
	require.NoError(t, db.Table("user_friends").Where("user_id = ? OR friend_id = ?", member.ID, member.ID).Count(&friendshipCount).Error)
	require.Zero(t, friendshipCount)
	_, err = tenants.UpdateUser(context.Background(), member.ID, v1.UpdateTenantUserRequest{Status: &suspended})
	require.Error(t, err)
	require.Error(t, tenants.DeleteUser(context.Background(), tenant.OwnerUserID))
}

func TestCreateUserRollsBackWhenTenantHasNoGroupRoom(t *testing.T) {
	db, tenants := setupTenantService(t)
	tenant, err := tenants.Create(context.Background(), v1.CreateTenantRequest{
		Name: "No Rooms", Slug: "no-rooms", OwnerEmail: "owner@no-rooms.test",
		OwnerPassword: "secure-pass", Plan: "starter",
	})
	require.NoError(t, err)
	require.NoError(t, db.Where("tenant_id = ?", tenant.ID).Delete(&model.Room{}).Error)

	_, err = tenants.CreateUser(context.Background(), tenant.ID, v1.CreateTenantUserRequest{
		Email: "member@no-rooms.test", Password: "member-pass", Role: "member",
	})
	require.Error(t, err)

	var count int64
	require.NoError(t, db.Model(&model.User{}).Where("email = ?", "member@no-rooms.test").Count(&count).Error)
	require.Zero(t, count)
}

func TestDeleteUserRequiresOwnedRoomTransfer(t *testing.T) {
	db, tenants := setupTenantService(t)
	tenant, err := tenants.Create(context.Background(), v1.CreateTenantRequest{
		Name: "Ownership", Slug: "ownership", OwnerEmail: "owner@ownership.test",
		OwnerPassword: "secure-pass", Plan: "starter",
	})
	require.NoError(t, err)
	member, err := tenants.CreateUser(context.Background(), tenant.ID, v1.CreateTenantUserRequest{
		Email: "creator@ownership.test", Password: "member-pass", Role: "member",
	})
	require.NoError(t, err)
	ownedRoom := model.Room{TenantID: tenant.ID, Name: "Owned room", ChannelType: model.RoomTypeGroup}
	require.NoError(t, db.Create(&ownedRoom).Error)
	require.NoError(t, db.Create(&model.RoomMember{
		RoomID: ownedRoom.ID, UserID: member.ID, Role: model.Creator,
	}).Error)

	err = tenants.DeleteUser(context.Background(), member.ID)
	require.ErrorContains(t, err, "transfer room ownership")
	var userCount int64
	require.NoError(t, db.Model(&model.User{}).Where("id = ?", member.ID).Count(&userCount).Error)
	require.Equal(t, int64(1), userCount)
}

func TestTenantListSupportsOwnerIDStatusAndPagination(t *testing.T) {
	db, tenants := setupTenantService(t)
	first, err := tenants.Create(context.Background(), v1.CreateTenantRequest{
		Name: "Alpha Team", Slug: "alpha-team", OwnerEmail: "owner@alpha.test",
		OwnerPassword: "secure-pass", Plan: "starter",
	})
	require.NoError(t, err)
	second, err := tenants.Create(context.Background(), v1.CreateTenantRequest{
		Name: "Beta Team", Slug: "beta-team", OwnerEmail: "owner@beta.test",
		OwnerPassword: "secure-pass", Plan: "pro",
	})
	require.NoError(t, err)

	_, err = tenants.CreateUser(context.Background(), first.ID, v1.CreateTenantUserRequest{
		Email: "member@alpha.test", Password: "member-pass", Role: "member",
	})
	require.NoError(t, err)
	require.NoError(t, db.Create(&model.Message{
		TenantID: first.ID, ChannelId: "1", RoomId: "1", UserId: "1", ContentType: "TEXT",
	}).Error)

	byOwner, err := tenants.List(context.Background(), "owner@alpha.test", "all", 20, 0)
	require.NoError(t, err)
	require.Equal(t, int64(1), byOwner.TotalCount)
	require.Len(t, byOwner.Tenants, 1)
	require.Equal(t, first.ID, byOwner.Tenants[0].ID)
	require.Equal(t, int64(2), byOwner.Tenants[0].MemberCount)
	require.Equal(t, int64(1), byOwner.Tenants[0].RoomCount)
	require.Equal(t, int64(1), byOwner.Tenants[0].MessageCount)

	byID, err := tenants.List(context.Background(), fmt.Sprintf("T-%d", second.ID), "all", 20, 0)
	require.NoError(t, err)
	require.Len(t, byID.Tenants, 1)
	require.Equal(t, second.ID, byID.Tenants[0].ID)

	active := model.TenantStatusActive
	_, err = tenants.Update(context.Background(), second.ID, v1.UpdateTenantRequest{Status: &active})
	require.NoError(t, err)
	activeOnly, err := tenants.List(context.Background(), "", active, 20, 0)
	require.NoError(t, err)
	require.Len(t, activeOnly.Tenants, 1)
	require.Equal(t, second.ID, activeOnly.Tenants[0].ID)

	page, err := tenants.List(context.Background(), "", "all", 1, 1)
	require.NoError(t, err)
	require.Equal(t, int64(2), page.TotalCount)
	require.Len(t, page.Tenants, 1)
	require.Equal(t, first.ID, page.Tenants[0].ID)
}

func TestTenantAndUserLifecycleCanArchiveRestoreAndSearch(t *testing.T) {
	_, tenants := setupTenantService(t)
	_, err := tenants.Create(context.Background(), v1.CreateTenantRequest{
		Name: "Default", Slug: "default", OwnerEmail: "owner@default.test",
		OwnerPassword: "secure-pass", Plan: "starter",
	})
	require.NoError(t, err)
	tenant, err := tenants.Create(context.Background(), v1.CreateTenantRequest{
		Name: "Lifecycle", Slug: "lifecycle", OwnerEmail: "owner@lifecycle.test",
		OwnerPassword: "secure-pass", Plan: "business",
	})
	require.NoError(t, err)
	user, err := tenants.CreateUser(context.Background(), tenant.ID, v1.CreateTenantUserRequest{
		Email: "searchable@lifecycle.test", Password: "member-pass", UserName: "Searchable",
	})
	require.NoError(t, err)

	users, err := tenants.ListUsers(context.Background(), tenant.ID, fmt.Sprintf("U-%d", user.ID), "active", 20, 0)
	require.NoError(t, err)
	require.Equal(t, int64(1), users.TotalCount)
	require.Len(t, users.Users, 1)
	require.Equal(t, user.ID, users.Users[0].ID)

	require.Error(t, tenants.Archive(context.Background(), 1))
	suspendedStatus := model.TenantStatusSuspended
	_, err = tenants.Update(context.Background(), 1, v1.UpdateTenantRequest{Status: &suspendedStatus})
	require.Error(t, err)
	require.NoError(t, tenants.Archive(context.Background(), tenant.ID))
	archived, err := tenants.Get(context.Background(), tenant.ID)
	require.NoError(t, err)
	require.Equal(t, model.TenantStatusArchived, archived.Status)

	restoredStatus := model.TenantStatusActive
	restored, err := tenants.Update(context.Background(), tenant.ID, v1.UpdateTenantRequest{Status: &restoredStatus})
	require.NoError(t, err)
	require.Equal(t, model.TenantStatusActive, restored.Status)
}

func TestPlatformAdministratorCannotBeModifiedOrDeleted(t *testing.T) {
	db, tenants := setupTenantService(t)
	tenant := model.Tenant{ID: 1, Name: "Default", Slug: "default", Plan: "starter", Status: model.TenantStatusActive}
	require.NoError(t, db.Create(&tenant).Error)
	administrator := model.User{
		TenantID: 1, UserName: "platform-owner", Email: "platform-owner@test.local",
		Permission: "platform_owner", Status: "active",
	}
	require.NoError(t, db.Create(&administrator).Error)

	memberRole := "member"
	_, err := tenants.UpdateUser(context.Background(), administrator.ID, v1.UpdateTenantUserRequest{Role: &memberRole})
	require.Error(t, err)
	suspended := "suspended"
	_, err = tenants.UpdateUser(context.Background(), administrator.ID, v1.UpdateTenantUserRequest{Status: &suspended})
	require.Error(t, err)
	newName := "compromised-owner"
	_, err = tenants.UpdateUser(context.Background(), administrator.ID, v1.UpdateTenantUserRequest{UserName: &newName})
	require.Error(t, err)
	newPassword := "replacement-password"
	_, err = tenants.UpdateUser(context.Background(), administrator.ID, v1.UpdateTenantUserRequest{Password: &newPassword})
	require.Error(t, err)
	require.Error(t, tenants.DeleteUser(context.Background(), administrator.ID))
}
