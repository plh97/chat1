package model

import (
	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	ID         uint   `gorm:"primarykey" json:"id"`
	TenantID   uint   `gorm:"not null;default:1;index:idx_users_tenant" json:"tenantId"`
	UserName   string `gorm:"unique;column:username" json:"userName"`
	Email      string `gorm:"unique;column:email" json:"email"`
	Password   string `gorm:"column:password" json:"-"`
	Bio        string `gorm:"column:bio" json:"bio"`
	QQ         string `gorm:"column:qq" json:"qq"`
	WeChat     string `gorm:"column:wechat" json:"wechat"`
	Github     string `gorm:"column:github" json:"github"`
	Permission string `gorm:"column:permission" json:"permission"`
	Status     string `gorm:"size:20;not null;default:active;index:idx_users_tenant" json:"status"`
	Image      string `gorm:"column:image" json:"image"`

	// Relations
	Rooms   []Room  `gorm:"many2many:room_members;joinForeignKey:UserID;joinReferences:RoomID" json:"rooms"`
	Friends []*User `gorm:"many2many:user_friends;joinForeignKey:user_id;joinReferences:friend_id" json:"friends"`
}

func (User) TableName() string {
	return "users"
}
