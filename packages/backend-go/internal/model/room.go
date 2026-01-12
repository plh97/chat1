package model

import (
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

const (
	RoomTypePrivate = "PRIVATE"
	RoomTypeGroup   = "PUBLIC"
)

type Room struct {
	gorm.Model
	ID          uint              `gorm:"primarykey" json:"id"`
	Name        string            `gorm:"column:name" json:"name"`
	Image       string            `gorm:"column:image" json:"image"`
	ChannelType string               `gorm:"column:channel_type" json:"channelType"`
	ReadSeq     datatypes.JSONMap `gorm:"column:read_seq;type:json" json:"read_seq"`

	// Relations
	Members []*User `gorm:"many2many:room_members;joinForeignKey:RoomID;joinReferences:UserID;where:role='member'" json:"member"`
	Admins  []*User `gorm:"many2many:room_members;joinForeignKey:RoomID;joinReferences:UserID;where:role='admin'" json:"admin"`

	// 【必须】保持为切片，因为是 many2many 关联
	CreatorList []*User `gorm:"many2many:room_members;joinForeignKey:RoomID;joinReferences:UserID;where:role='creator'" json:"-"`
	Creator     *User   `gorm:"-" json:"creator"`
}

// 【技巧】使用 AfterFind 钩子，查询后自动把切片里的第一个人拿出来赋值给 Creator
func (r *Room) AfterFind(tx *gorm.DB) (err error) {
	if len(r.CreatorList) > 0 {
		r.Creator = r.CreatorList[0]
	}
	return
}

// BeforeCreate GORM hook: sets default values before creating a record
func (r *Room) BeforeCreate(tx *gorm.DB) error {
	if r.ChannelType == "" {
		r.ChannelType = RoomTypeGroup // GROUP
	}
	if r.ReadSeq == nil {
		r.ReadSeq = datatypes.JSONMap{}
	}
	return nil
}

func (Room) TableName() string {
	return "rooms"
}
