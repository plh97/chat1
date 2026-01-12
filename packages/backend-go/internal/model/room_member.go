package model

import (
	"gorm.io/gorm"
)

const (
	Creator = "creator"
	Admin   = "admin"
	Member  = "member"
)

// RoomMember represents the many-to-many relationship between users and rooms with role
type RoomMember struct {
	gorm.Model

	Role string `gorm:"column:role;type:varchar(50);default:'member'" json:"role"` // "creator", "admin", "member"

	// Relations
	UserID    uint  `gorm:"primaryKey;"`
	UserModel *User `gorm:"foreignKey:UserID" json:"user"`
	RoomID    uint  `gorm:"primaryKey"`
	RoomModel *Room `gorm:"foreignKey:RoomID" json:"room"`
}

// // BeforeCreate GORM hook: sets default values before creating a record
// func (rm *RoomMember) BeforeCreate(tx *gorm.DB) error {
// 	if rm.Role == "" {
// 		rm.Role = "member"
// 	}
// 	return nil
// }

func (RoomMember) TableName() string {
	return "room_members"
}
