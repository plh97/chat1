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

func (m *Message) normalizeJSONFields() {
	if m.TextMessage == "" {
		m.TextMessage = "null"
	}
	if m.MediaMessage == "" {
		m.MediaMessage = "null"
	}
	if m.ReadMessage == "" {
		m.ReadMessage = "null"
	}
	if m.RecallMessage == "" {
		m.RecallMessage = "null"
	}
	if m.SystemMessage == "" {
		m.SystemMessage = "null"
	}
}

func (m *Message) BeforeCreate(tx *gorm.DB) error {
	m.normalizeJSONFields()
	return nil
}

func (m *Message) BeforeSave(tx *gorm.DB) error {
	m.normalizeJSONFields()
	return nil
}

func (Message) TableName() string {
	return "messages"
}
