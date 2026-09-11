package model

import (
	"time"

	"gorm.io/gorm"
)

const (
	TenantStatusTrial     = "trial"
	TenantStatusActive    = "active"
	TenantStatusSuspended = "suspended"
	TenantStatusArchived  = "archived"
)

// Tenant is an isolated chat workspace. Business data carries TenantID so a
// request can never cross workspace boundaries by guessing another record ID.
type Tenant struct {
	gorm.Model
	ID                 uint       `gorm:"primarykey" json:"id"`
	Name               string     `gorm:"size:100;not null" json:"name"`
	Slug               string     `gorm:"size:64;uniqueIndex;not null" json:"slug"`
	Plan               string     `gorm:"size:30;not null;default:starter" json:"plan"`
	Status             string     `gorm:"size:20;not null;default:trial;index" json:"status"`
	OwnerUserID        uint       `gorm:"index" json:"ownerUserId"`
	MemberLimit        int        `gorm:"not null;default:10" json:"memberLimit"`
	StorageLimit       int64      `gorm:"not null;default:1073741824" json:"storageLimit"`
	TrialEndsAt        *time.Time `json:"trialEndsAt,omitempty"`
	SubscriptionEndsAt *time.Time `json:"subscriptionEndsAt,omitempty"`
}

func (Tenant) TableName() string { return "tenants" }
