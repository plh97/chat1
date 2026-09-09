package model

import (
	"encoding/json"
	"time"

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
	ChannelType string            `gorm:"column:channel_type" json:"channelType"`
	LastSeq     int               `gorm:"column:last_seq;default:0" json:"-"`
	ReadSeq     datatypes.JSONMap `gorm:"column:read_seq;type:json" json:"readSeq"`
	UnreadCount int64             `gorm:"-" json:"unreadCount"`
	LastMsg     *MessageSummary   `gorm:"-" json:"lastMsg,omitempty"`

	// Relations
	Members []*User `gorm:"many2many:room_members;joinForeignKey:RoomID;joinReferences:UserID;where:role='member'" json:"member"`
	Admins  []*User `gorm:"many2many:room_members;joinForeignKey:RoomID;joinReferences:UserID;where:role='admin'" json:"admin"`
	Peer    *User   `gorm:"-" json:"peer,omitempty"`

	// 【必须】保持为切片，因为是 many2many 关联
	CreatorList []*User `gorm:"many2many:room_members;joinForeignKey:RoomID;joinReferences:UserID;where:role='creator'" json:"-"`
	Creator     *User   `gorm:"-" json:"creator"`
}

type MessageSummary struct {
	ID            uint            `json:"id"`
	CreatedAt     time.Time       `json:"createdAt"`
	UpdatedAt     time.Time       `json:"updatedAt"`
	Seq           int             `json:"seq"`
	ContentType   string          `json:"contentType"`
	ChannelID     string          `json:"channelId"`
	TextMessage   json.RawMessage `json:"textMessage,omitempty"`
	MediaMessage  json.RawMessage `json:"mediaMessage,omitempty"`
	SystemMessage json.RawMessage `json:"systemMessage,omitempty"`
	RecallMessage json.RawMessage `json:"recallMessage,omitempty"`
	UserID        string          `json:"userId"`
	RoomID        string          `json:"roomId,omitempty"`
	IsRecalled    bool            `json:"isRecalled"`
}

func messageJSONSummary(raw string) json.RawMessage {
	if raw == "" || raw == "null" || !json.Valid([]byte(raw)) {
		return nil
	}
	return json.RawMessage(raw)
}

func NewMessageSummary(message *Message) *MessageSummary {
	if message == nil {
		return nil
	}
	return &MessageSummary{
		ID:            message.ID,
		CreatedAt:     message.CreatedAt,
		UpdatedAt:     message.UpdatedAt,
		Seq:           message.Seq,
		ContentType:   message.ContentType,
		ChannelID:     message.ChannelId,
		TextMessage:   messageJSONSummary(message.TextMessage),
		MediaMessage:  messageJSONSummary(message.MediaMessage),
		SystemMessage: messageJSONSummary(message.SystemMessage),
		RecallMessage: messageJSONSummary(message.RecallMessage),
		UserID:        message.UserId,
		RoomID:        message.RoomId,
		IsRecalled:    message.IsRecalled,
	}
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
