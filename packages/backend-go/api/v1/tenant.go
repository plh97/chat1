package v1

import "time"

type CreateTenantRequest struct {
	Name          string `json:"name" binding:"required,max=100"`
	Slug          string `json:"slug" binding:"required,max=64"`
	OwnerEmail    string `json:"ownerEmail" binding:"required,email"`
	OwnerPassword string `json:"ownerPassword" binding:"required,min=8"`
	Plan          string `json:"plan" binding:"required,oneof=starter pro business"`
	TrialDays     int    `json:"trialDays" binding:"omitempty,min=1,max=365"`
	MemberLimit   int    `json:"memberLimit" binding:"omitempty,min=1"`
	StorageLimit  int64  `json:"storageLimit" binding:"omitempty,min=1"`
}

type UpdateTenantRequest struct {
	Name         *string `json:"name" binding:"omitempty,max=100"`
	Plan         *string `json:"plan" binding:"omitempty,oneof=starter pro business"`
	Status       *string `json:"status" binding:"omitempty,oneof=trial active suspended archived"`
	MemberLimit  *int    `json:"memberLimit" binding:"omitempty,min=1"`
	StorageLimit *int64  `json:"storageLimit" binding:"omitempty,min=1"`
}

type TenantResponse struct {
	ID           uint       `json:"id"`
	Name         string     `json:"name"`
	Slug         string     `json:"slug"`
	Plan         string     `json:"plan"`
	Status       string     `json:"status"`
	OwnerUserID  uint       `json:"ownerUserId"`
	OwnerEmail   string     `json:"ownerEmail"`
	MemberLimit  int        `json:"memberLimit"`
	StorageLimit int64      `json:"storageLimit"`
	MemberCount  int64      `json:"memberCount"`
	RoomCount    int64      `json:"roomCount"`
	MessageCount int64      `json:"messageCount"`
	TrialEndsAt  *time.Time `json:"trialEndsAt,omitempty"`
	CreatedAt    time.Time  `json:"createdAt"`
}

type TenantListResponse struct {
	Tenants    []TenantResponse `json:"tenants"`
	TotalCount int64            `json:"totalCount"`
}

type PlatformOverviewResponse struct {
	TenantCount   int64 `json:"tenantCount"`
	ActiveTenants int64 `json:"activeTenants"`
	UserCount     int64 `json:"userCount"`
	RoomCount     int64 `json:"roomCount"`
	MessageCount  int64 `json:"messageCount"`
}

type CreateTenantUserRequest struct {
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required,min=8"`
	UserName    string `json:"userName" binding:"omitempty,max=100"`
	Role        string `json:"role" binding:"omitempty,oneof=tenant_admin member"`
	JoinGeneral *bool  `json:"joinGeneral"`
}

type UpdateTenantUserRequest struct {
	UserName *string `json:"userName" binding:"omitempty,max=100"`
	Role     *string `json:"role" binding:"omitempty,oneof=tenant_owner tenant_admin member"`
	Status   *string `json:"status" binding:"omitempty,oneof=active suspended"`
	Password *string `json:"password" binding:"omitempty,min=8"`
}

type PlatformUserResponse struct {
	ID         uint      `json:"id"`
	TenantID   uint      `json:"tenantId"`
	TenantName string    `json:"tenantName"`
	UserName   string    `json:"userName"`
	Email      string    `json:"email"`
	Role       string    `json:"role"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"createdAt"`
}

type PlatformUserListResponse struct {
	Users      []PlatformUserResponse `json:"users"`
	TotalCount int64                  `json:"totalCount"`
}

type PlatformSystemResponse struct {
	Database  string    `json:"database"`
	Status    string    `json:"status"`
	CheckedAt time.Time `json:"checkedAt"`
}
