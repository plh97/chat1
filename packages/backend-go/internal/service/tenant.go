package service

import (
	v1 "backend-go/api/v1"
	"backend-go/internal/model"
	"backend-go/internal/repository"
	"context"
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/datatypes"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var ErrTenantConflict = errors.New("tenant slug or owner email already exists")
var tenantSlugPattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

type TenantService interface {
	Overview(ctx context.Context) (*v1.PlatformOverviewResponse, error)
	List(ctx context.Context, query, status string, pageSize, start int) (*v1.TenantListResponse, error)
	Get(ctx context.Context, id uint) (*v1.TenantResponse, error)
	Create(ctx context.Context, req v1.CreateTenantRequest) (*v1.TenantResponse, error)
	Update(ctx context.Context, id uint, req v1.UpdateTenantRequest) (*v1.TenantResponse, error)
	Archive(ctx context.Context, id uint) error
	ListUsers(ctx context.Context, tenantID uint, query, status string, pageSize, start int) (*v1.PlatformUserListResponse, error)
	CreateUser(ctx context.Context, tenantID uint, req v1.CreateTenantUserRequest) (*v1.PlatformUserResponse, error)
	UpdateUser(ctx context.Context, userID uint, req v1.UpdateTenantUserRequest) (*v1.PlatformUserResponse, error)
	DeleteUser(ctx context.Context, userID uint) error
	System(ctx context.Context) (*v1.PlatformSystemResponse, error)
}

type tenantService struct{ *Service }

func NewTenantService(service *Service) TenantService { return &tenantService{Service: service} }

func (s *tenantService) Overview(ctx context.Context) (*v1.PlatformOverviewResponse, error) {
	db := s.tm.(*repository.Repository).DB(ctx)
	result := &v1.PlatformOverviewResponse{}
	if err := db.Model(&model.Tenant{}).Count(&result.TenantCount).Error; err != nil {
		return nil, err
	}
	if err := db.Model(&model.Tenant{}).Where("status IN ?", []string{model.TenantStatusTrial, model.TenantStatusActive}).Count(&result.ActiveTenants).Error; err != nil {
		return nil, err
	}
	if err := db.Model(&model.User{}).Count(&result.UserCount).Error; err != nil {
		return nil, err
	}
	if err := db.Model(&model.Room{}).Count(&result.RoomCount).Error; err != nil {
		return nil, err
	}
	if err := db.Model(&model.Message{}).Count(&result.MessageCount).Error; err != nil {
		return nil, err
	}
	return result, nil
}

func (s *tenantService) List(ctx context.Context, query, status string, pageSize, start int) (*v1.TenantListResponse, error) {
	db := s.tm.(*repository.Repository).DB(ctx).
		Model(&model.Tenant{}).
		Joins("LEFT JOIN users AS tenant_owners ON tenant_owners.id = tenants.owner_user_id AND tenant_owners.deleted_at IS NULL").
		Where("tenants.deleted_at IS NULL")
	if trimmedQuery := strings.TrimSpace(query); trimmedQuery != "" {
		like := "%" + trimmedQuery + "%"
		idValue := strings.TrimPrefix(strings.ToUpper(trimmedQuery), "T-")
		if tenantID, err := strconv.ParseUint(idValue, 10, 64); err == nil {
			db = db.Where(
				"(tenants.name LIKE ? OR tenants.slug LIKE ? OR tenant_owners.email LIKE ? OR tenants.id = ?)",
				like,
				like,
				like,
				tenantID,
			)
		} else {
			db = db.Where(
				"(tenants.name LIKE ? OR tenants.slug LIKE ? OR tenant_owners.email LIKE ?)",
				like,
				like,
				like,
			)
		}
	}
	if status != "" && status != "all" {
		db = db.Where("tenants.status = ?", status)
	}
	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, err
	}
	var tenants []model.Tenant
	if err := db.Select("tenants.*").Order("tenants.id DESC").Limit(pageSize).Offset(start).Find(&tenants).Error; err != nil {
		return nil, err
	}
	items, err := s.toResponses(ctx, tenants)
	if err != nil {
		return nil, err
	}
	return &v1.TenantListResponse{Tenants: items, TotalCount: total}, nil
}

func (s *tenantService) Get(ctx context.Context, id uint) (*v1.TenantResponse, error) {
	var tenant model.Tenant
	if err := s.tm.(*repository.Repository).DB(ctx).First(&tenant, id).Error; err != nil {
		return nil, err
	}
	return s.toResponse(ctx, tenant)
}

func (s *tenantService) Create(ctx context.Context, req v1.CreateTenantRequest) (*v1.TenantResponse, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, errors.New("tenant name is required")
	}
	slug := strings.ToLower(strings.TrimSpace(req.Slug))
	if !tenantSlugPattern.MatchString(slug) {
		return nil, fmt.Errorf("invalid tenant slug")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.OwnerPassword), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	memberLimit := req.MemberLimit
	if memberLimit == 0 {
		memberLimit = 10
	}
	storageLimit := req.StorageLimit
	if storageLimit == 0 {
		storageLimit = 1 << 30
	}
	trialDays := req.TrialDays
	if trialDays == 0 {
		trialDays = 14
	}
	trialEnds := time.Now().Add(time.Duration(trialDays) * 24 * time.Hour)
	var tenant model.Tenant
	err = s.tm.Transaction(ctx, func(txCtx context.Context) error {
		db := s.tm.(*repository.Repository).DB(txCtx)
		tenant = model.Tenant{Name: name, Slug: slug, Plan: req.Plan, Status: model.TenantStatusTrial, MemberLimit: memberLimit, StorageLimit: storageLimit, TrialEndsAt: &trialEnds}
		if err := db.Create(&tenant).Error; err != nil {
			return ErrTenantConflict
		}
		owner := model.User{TenantID: tenant.ID, UserName: req.OwnerEmail, Email: strings.ToLower(strings.TrimSpace(req.OwnerEmail)), Password: string(hash), Permission: "tenant_owner"}
		if err := db.Create(&owner).Error; err != nil {
			return ErrTenantConflict
		}
		room := model.Room{TenantID: tenant.ID, Name: "General", ChannelType: model.RoomTypeGroup, ReadSeq: datatypes.JSONMap{}}
		if err := db.Create(&room).Error; err != nil {
			return err
		}
		if err := db.Create(&model.RoomMember{RoomID: room.ID, UserID: owner.ID, Role: model.Creator}).Error; err != nil {
			return err
		}
		if err := db.Model(&tenant).Update("owner_user_id", owner.ID).Error; err != nil {
			return err
		}
		tenant.OwnerUserID = owner.ID
		return nil
	})
	if err != nil {
		return nil, err
	}
	return s.toResponse(ctx, tenant)
}

func (s *tenantService) Update(ctx context.Context, id uint, req v1.UpdateTenantRequest) (*v1.TenantResponse, error) {
	if id == 1 && req.Status != nil && *req.Status != model.TenantStatusActive {
		return nil, errors.New("default tenant must remain active")
	}
	updates := map[string]interface{}{}
	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		if name == "" {
			return nil, errors.New("tenant name is required")
		}
		updates["name"] = name
	}
	if req.Plan != nil {
		updates["plan"] = *req.Plan
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}
	if req.MemberLimit != nil {
		updates["member_limit"] = *req.MemberLimit
	}
	if req.StorageLimit != nil {
		updates["storage_limit"] = *req.StorageLimit
	}
	if len(updates) > 0 {
		result := s.tm.(*repository.Repository).DB(ctx).Model(&model.Tenant{}).Where("id = ? AND deleted_at IS NULL", id).Updates(updates)
		if result.Error != nil {
			return nil, result.Error
		}
		if result.RowsAffected == 0 {
			return nil, gorm.ErrRecordNotFound
		}
	}
	return s.Get(ctx, id)
}

func (s *tenantService) Archive(ctx context.Context, id uint) error {
	if id == 1 {
		return errors.New("default tenant cannot be archived")
	}
	return s.tm.Transaction(ctx, func(txCtx context.Context) error {
		db := s.tm.(*repository.Repository).DB(txCtx)
		result := db.Model(&model.Tenant{}).Where("id = ? AND deleted_at IS NULL", id).Update("status", model.TenantStatusArchived)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return gorm.ErrRecordNotFound
		}
		return nil
	})
}

func (s *tenantService) ListUsers(ctx context.Context, tenantID uint, search, status string, pageSize, start int) (*v1.PlatformUserListResponse, error) {
	db := s.tm.(*repository.Repository).DB(ctx).Table("users").
		Select("users.id, users.tenant_id, tenants.name AS tenant_name, users.username AS user_name, users.email, users.permission AS role, users.status, users.created_at").
		Joins("JOIN tenants ON tenants.id = users.tenant_id AND tenants.deleted_at IS NULL").
		Where("users.deleted_at IS NULL")
	if tenantID != 0 {
		db = db.Where("users.tenant_id = ?", tenantID)
	}
	if trimmedSearch := strings.TrimSpace(search); trimmedSearch != "" {
		like := "%" + trimmedSearch + "%"
		idValue := strings.TrimPrefix(strings.ToUpper(trimmedSearch), "U-")
		if userID, err := strconv.ParseUint(idValue, 10, 64); err == nil {
			db = db.Where(
				"(users.username LIKE ? OR users.email LIKE ? OR tenants.name LIKE ? OR users.id = ?)",
				like,
				like,
				like,
				userID,
			)
		} else {
			db = db.Where(
				"(users.username LIKE ? OR users.email LIKE ? OR tenants.name LIKE ?)",
				like,
				like,
				like,
			)
		}
	}
	if status != "" && status != "all" {
		db = db.Where("users.status = ?", status)
	}
	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, err
	}
	var users []v1.PlatformUserResponse
	if err := db.Order("users.id DESC").Limit(pageSize).Offset(start).Scan(&users).Error; err != nil {
		return nil, err
	}
	return &v1.PlatformUserListResponse{Users: users, TotalCount: total}, nil
}

func (s *tenantService) CreateUser(ctx context.Context, tenantID uint, req v1.CreateTenantUserRequest) (*v1.PlatformUserResponse, error) {
	if tenantID == 0 {
		return nil, gorm.ErrRecordNotFound
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	role := req.Role
	if role == "" {
		role = "member"
	}
	name := strings.TrimSpace(req.UserName)
	if name == "" {
		name = strings.ToLower(strings.TrimSpace(req.Email))
	}
	joinGeneral := req.JoinGeneral == nil || *req.JoinGeneral
	var user model.User
	err = s.tm.Transaction(ctx, func(txCtx context.Context) error {
		db := s.tm.(*repository.Repository).DB(txCtx)
		var tenant model.Tenant
		if err := db.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND status <> ?", tenantID, model.TenantStatusArchived).
			First(&tenant).Error; err != nil {
			return err
		}
		var count int64
		if err := db.Model(&model.User{}).Where("tenant_id = ?", tenantID).Count(&count).Error; err != nil {
			return err
		}
		if tenant.MemberLimit > 0 && count >= int64(tenant.MemberLimit) {
			return fmt.Errorf("tenant member limit reached")
		}
		user = model.User{TenantID: tenantID, UserName: name, Email: strings.ToLower(strings.TrimSpace(req.Email)), Password: string(hash), Permission: role, Status: "active"}
		if err := db.Create(&user).Error; err != nil {
			return ErrTenantConflict
		}
		if joinGeneral {
			var room model.Room
			if err := db.Where("tenant_id = ? AND channel_type = ?", tenantID, model.RoomTypeGroup).
				Order("id ASC").First(&room).Error; err != nil {
				return fmt.Errorf("tenant default room unavailable: %w", err)
			}
			if err := db.Create(&model.RoomMember{RoomID: room.ID, UserID: user.ID, Role: model.Member}).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return s.platformUser(ctx, user.ID)
}

func (s *tenantService) UpdateUser(ctx context.Context, userID uint, req v1.UpdateTenantUserRequest) (*v1.PlatformUserResponse, error) {
	db := s.tm.(*repository.Repository).DB(ctx)
	var user model.User
	if err := db.First(&user, userID).Error; err != nil {
		return nil, err
	}
	var tenant model.Tenant
	if err := db.First(&tenant, user.TenantID).Error; err != nil {
		return nil, err
	}
	if user.Permission == "platform_owner" || user.Permission == "platform_admin" {
		return nil, errors.New("platform administrator access must be managed separately")
	}
	if tenant.OwnerUserID == userID && ((req.Role != nil && *req.Role != "tenant_owner") || (req.Status != nil && *req.Status != "active")) {
		return nil, errors.New("tenant owner cannot be demoted or suspended")
	}
	updates := map[string]interface{}{}
	if req.UserName != nil {
		updates["username"] = strings.TrimSpace(*req.UserName)
	}
	if req.Role != nil {
		updates["permission"] = *req.Role
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}
	if req.Password != nil {
		hash, err := bcrypt.GenerateFromPassword([]byte(*req.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}
		updates["password"] = string(hash)
	}
	if len(updates) > 0 {
		if err := db.Model(&user).Updates(updates).Error; err != nil {
			return nil, err
		}
	}
	return s.platformUser(ctx, userID)
}

func (s *tenantService) DeleteUser(ctx context.Context, userID uint) error {
	return s.tm.Transaction(ctx, func(txCtx context.Context) error {
		db := s.tm.(*repository.Repository).DB(txCtx)
		var user model.User
		if err := db.First(&user, userID).Error; err != nil {
			return err
		}
		if user.Permission == "platform_owner" || user.Permission == "platform_admin" {
			return errors.New("platform administrator cannot be deleted")
		}
		var tenant model.Tenant
		if err := db.First(&tenant, user.TenantID).Error; err != nil {
			return err
		}
		if tenant.OwnerUserID == userID {
			return errors.New("tenant owner cannot be deleted")
		}

		var ownedGroupRooms int64
		if err := db.Table("room_members").
			Joins("JOIN rooms ON rooms.id = room_members.room_id AND rooms.deleted_at IS NULL").
			Where("room_members.user_id = ? AND room_members.role = ? AND room_members.deleted_at IS NULL", userID, model.Creator).
			Where("rooms.tenant_id = ? AND rooms.channel_type <> ?", user.TenantID, model.RoomTypePrivate).
			Count(&ownedGroupRooms).Error; err != nil {
			return err
		}
		if ownedGroupRooms > 0 {
			return errors.New("user owns one or more rooms; transfer room ownership before deleting the account")
		}

		var privateRoomIDs []uint
		if err := db.Table("room_members").
			Select("room_members.room_id").
			Joins("JOIN rooms ON rooms.id = room_members.room_id AND rooms.deleted_at IS NULL").
			Where("room_members.user_id = ? AND room_members.deleted_at IS NULL", userID).
			Where("rooms.tenant_id = ? AND rooms.channel_type = ?", user.TenantID, model.RoomTypePrivate).
			Pluck("room_members.room_id", &privateRoomIDs).Error; err != nil {
			return err
		}
		if len(privateRoomIDs) > 0 {
			if err := db.Unscoped().Where("room_id IN ?", privateRoomIDs).Delete(&model.RoomMember{}).Error; err != nil {
				return err
			}
			if err := db.Where("tenant_id = ? AND id IN ?", user.TenantID, privateRoomIDs).Delete(&model.Room{}).Error; err != nil {
				return err
			}
		}
		if err := db.Exec("DELETE FROM user_friends WHERE user_id = ? OR friend_id = ?", userID, userID).Error; err != nil {
			return err
		}
		if err := db.Unscoped().Where("user_id = ?", userID).Delete(&model.RoomMember{}).Error; err != nil {
			return err
		}
		return db.Delete(&user).Error
	})
}

func (s *tenantService) System(ctx context.Context) (*v1.PlatformSystemResponse, error) {
	sqlDB, err := s.tm.(*repository.Repository).DB(ctx).DB()
	if err != nil {
		return nil, err
	}
	if err := sqlDB.PingContext(ctx); err != nil {
		return nil, err
	}
	return &v1.PlatformSystemResponse{Database: "connected", Status: "operational", CheckedAt: time.Now()}, nil
}

func (s *tenantService) platformUser(ctx context.Context, userID uint) (*v1.PlatformUserResponse, error) {
	var user v1.PlatformUserResponse
	err := s.tm.(*repository.Repository).DB(ctx).Table("users").
		Select("users.id, users.tenant_id, tenants.name AS tenant_name, users.username AS user_name, users.email, users.permission AS role, users.status, users.created_at").
		Joins("JOIN tenants ON tenants.id = users.tenant_id").Where("users.id = ? AND users.deleted_at IS NULL", userID).Scan(&user).Error
	return &user, err
}

func (s *tenantService) toResponse(ctx context.Context, tenant model.Tenant) (*v1.TenantResponse, error) {
	db := s.tm.(*repository.Repository).DB(ctx)
	var owner model.User
	if tenant.OwnerUserID != 0 {
		_ = db.Select("email").First(&owner, tenant.OwnerUserID).Error
	}
	var members, rooms, messages int64
	if err := db.Model(&model.User{}).Where("tenant_id = ?", tenant.ID).Count(&members).Error; err != nil {
		return nil, err
	}
	if err := db.Model(&model.Room{}).Where("tenant_id = ?", tenant.ID).Count(&rooms).Error; err != nil {
		return nil, err
	}
	if err := db.Model(&model.Message{}).Where("tenant_id = ?", tenant.ID).Count(&messages).Error; err != nil {
		return nil, err
	}
	return &v1.TenantResponse{ID: tenant.ID, Name: tenant.Name, Slug: tenant.Slug, Plan: tenant.Plan, Status: tenant.Status, OwnerUserID: tenant.OwnerUserID, OwnerEmail: owner.Email, MemberLimit: tenant.MemberLimit, StorageLimit: tenant.StorageLimit, MemberCount: members, RoomCount: rooms, MessageCount: messages, TrialEndsAt: tenant.TrialEndsAt, CreatedAt: tenant.CreatedAt}, nil
}

type tenantCountRow struct {
	TenantID uint
	Count    int64
}

func (s *tenantService) toResponses(ctx context.Context, tenants []model.Tenant) ([]v1.TenantResponse, error) {
	items := make([]v1.TenantResponse, 0, len(tenants))
	if len(tenants) == 0 {
		return items, nil
	}

	tenantIDs := make([]uint, 0, len(tenants))
	ownerIDs := make([]uint, 0, len(tenants))
	for _, tenant := range tenants {
		tenantIDs = append(tenantIDs, tenant.ID)
		if tenant.OwnerUserID != 0 {
			ownerIDs = append(ownerIDs, tenant.OwnerUserID)
		}
	}

	db := s.tm.(*repository.Repository).DB(ctx)
	ownerEmails := make(map[uint]string, len(ownerIDs))
	if len(ownerIDs) > 0 {
		var owners []model.User
		if err := db.Select("id", "email").Where("id IN ?", ownerIDs).Find(&owners).Error; err != nil {
			return nil, err
		}
		for _, owner := range owners {
			ownerEmails[owner.ID] = owner.Email
		}
	}

	loadCounts := func(modelValue interface{}) (map[uint]int64, error) {
		var rows []tenantCountRow
		if err := db.Model(modelValue).
			Select("tenant_id, COUNT(*) AS count").
			Where("tenant_id IN ?", tenantIDs).
			Group("tenant_id").
			Scan(&rows).Error; err != nil {
			return nil, err
		}
		counts := make(map[uint]int64, len(rows))
		for _, row := range rows {
			counts[row.TenantID] = row.Count
		}
		return counts, nil
	}

	members, err := loadCounts(&model.User{})
	if err != nil {
		return nil, err
	}
	rooms, err := loadCounts(&model.Room{})
	if err != nil {
		return nil, err
	}
	messages, err := loadCounts(&model.Message{})
	if err != nil {
		return nil, err
	}

	for _, tenant := range tenants {
		items = append(items, v1.TenantResponse{
			ID:           tenant.ID,
			Name:         tenant.Name,
			Slug:         tenant.Slug,
			Plan:         tenant.Plan,
			Status:       tenant.Status,
			OwnerUserID:  tenant.OwnerUserID,
			OwnerEmail:   ownerEmails[tenant.OwnerUserID],
			MemberLimit:  tenant.MemberLimit,
			StorageLimit: tenant.StorageLimit,
			MemberCount:  members[tenant.ID],
			RoomCount:    rooms[tenant.ID],
			MessageCount: messages[tenant.ID],
			TrialEndsAt:  tenant.TrialEndsAt,
			CreatedAt:    tenant.CreatedAt,
		})
	}
	return items, nil
}
