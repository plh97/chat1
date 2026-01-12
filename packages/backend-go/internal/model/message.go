package model

import (
	"gorm.io/gorm"
)

type Message struct {
	gorm.Model
	ID            uint   `gorm:"primarykey" json:"id"`
	Seq           int    `gorm:"column:seq;index" json:"seq"`
	ContentType   string `gorm:"column:content_type" json:"content_type"`
	ChannelId     string `gorm:"column:channel_id;index" json:"channel_id"`
	TextMessage   string `gorm:"column:text_message;type:json" json:"text_message"`
	MediaMessage  string `gorm:"column:media_message;type:json" json:"media_message"`
	ReadMessage   string `gorm:"column:read_message;type:json" json:"read_message"`
	RecallMessage string `gorm:"column:recall_message;type:json" json:"recall_message"`
	SystemMessage string `gorm:"column:system_message;type:json" json:"system_message"`
	UserId        string `gorm:"column:user_id;index" json:"user_id"`
	RoomId        string `gorm:"column:room_id;index" json:"room_id"`
	ReplyId       string `gorm:"column:reply_id" json:"reply_id"`
	IsRecalled    bool   `gorm:"column:is_recalled;default:false" json:"is_recalled"`
}

func (Message) TableName() string {
	return "messages"
}
