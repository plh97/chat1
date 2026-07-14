package ws

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"backend-go/internal/model"

	"github.com/gorilla/websocket"
)

const wsSendMessageEvent = "WS_SEND_MESSAGE"

type wsEnvelope struct {
	Event     string          `json:"event"`
	Data      json.RawMessage `json:"data"`
	RequestID string          `json:"requestId"`
	Message   string          `json:"message,omitempty"`
	Code      int             `json:"code"`
}

type incomingMessage struct {
	ID            uint            `json:"id,omitempty"`
	Seq           int             `json:"seq,omitempty"`
	ContentType   string          `json:"contentType"`
	ChannelID     json.RawMessage `json:"channelId"`
	TextMessage   json.RawMessage `json:"textMessage,omitempty"`
	MediaMessage  json.RawMessage `json:"mediaMessage,omitempty"`
	ReadMessage   json.RawMessage `json:"readMessage,omitempty"`
	RecallMessage json.RawMessage `json:"recallMessage,omitempty"`
	SystemMessage json.RawMessage `json:"systemMessage,omitempty"`
	UserID        json.RawMessage `json:"userId"`
	ReplyID       json.RawMessage `json:"replyId,omitempty"`
}

type wsUser struct {
	ID       uint   `json:"id"`
	UserID   string `json:"userId"`
	UserName string `json:"userName"`
	Image    string `json:"image"`
	Email    string `json:"email,omitempty"`
	Bio      string `json:"bio,omitempty"`
	QQ       string `json:"qq,omitempty"`
	WeChat   string `json:"wechat,omitempty"`
	Github   string `json:"github,omitempty"`
}

type outgoingMessage struct {
	ID            uint        `json:"id"`
	CreatedAt     time.Time   `json:"createdAt"`
	UpdatedAt     time.Time   `json:"updatedAt"`
	Seq           int         `json:"seq"`
	ContentType   string      `json:"contentType"`
	ChannelID     string      `json:"channelId"`
	TextMessage   interface{} `json:"textMessage,omitempty"`
	MediaMessage  interface{} `json:"mediaMessage,omitempty"`
	ReadMessage   interface{} `json:"readMessage,omitempty"`
	RecallMessage interface{} `json:"recallMessage,omitempty"`
	SystemMessage interface{} `json:"systemMessage,omitempty"`
	UserID        string      `json:"userId"`
	RoomID        string      `json:"roomId,omitempty"`
	ReplyID       string      `json:"replyId,omitempty"`
	Reply         interface{} `json:"reply,omitempty"`
	IsRecalled    bool        `json:"isRecalled"`
	User          *wsUser     `json:"user,omitempty"`
}

var upgrader = websocket.Upgrader{
	// 允许跨域（方便本地测试）
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type Client struct {
	hub  *Hub
	conn *websocket.Conn
	// 用于缓冲待发送消息的通道
	send chan []byte
}

// 读循环：从 WebSocket 读取消息 -> 扔给 Hub 广播
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()
	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}
		if err := c.handleIncomingMessage(message); err != nil {
			if writeErr := c.writeErrorResponse("", err); writeErr != nil {
				log.Printf("write websocket error response failed: %v", writeErr)
			}
		}
	}
}

func (c *Client) handleIncomingMessage(raw []byte) error {
	var envelope wsEnvelope
	if err := json.Unmarshal(raw, &envelope); err != nil {
		return err
	}

	if envelope.Event != wsSendMessageEvent {
		c.hub.broadcast <- raw
		return nil
	}

	response, err := c.hub.handleSendMessage(context.Background(), envelope)
	if err != nil {
		return c.writeErrorResponse(envelope.RequestID, err)
	}

	c.hub.broadcast <- response
	return nil
}

func (c *Client) writeErrorResponse(requestID string, err error) error {
	response, marshalErr := json.Marshal(wsEnvelope{
		Event:     wsSendMessageEvent,
		RequestID: requestID,
		Code:      1,
		Message:   err.Error(),
	})
	if marshalErr != nil {
		return marshalErr
	}
	return c.conn.WriteMessage(websocket.TextMessage, response)
}

func (h *Hub) handleSendMessage(ctx context.Context, envelope wsEnvelope) ([]byte, error) {
	var payload incomingMessage
	if err := json.Unmarshal(envelope.Data, &payload); err != nil {
		return nil, err
	}
	userID := rawMessageToScalarString(payload.UserID)
	channelID := rawMessageToScalarString(payload.ChannelID)
	if channelID == "" {
		return nil, errors.New("channelId is required")
	}

	switch payload.ContentType {
	case "TEXT_MESSAGE", "MEDIA_MESSAGE", "SYSTEM_MESSAGE":
		if userID == "" {
			return nil, errors.New("userId is required")
		}
		responseData, err := h.persistMessage(ctx, payload, userID, channelID)
		if err != nil {
			return nil, err
		}
		return json.Marshal(wsEnvelope{
			Event:     wsSendMessageEvent,
			RequestID: envelope.RequestID,
			Code:      0,
			Data:      mustMarshalRawMessage(responseData),
		})
	case "READ_MESSAGE":
		responsePayload := map[string]interface{}{
			"id":            payload.ID,
			"seq":           payload.Seq,
			"contentType":   payload.ContentType,
			"channelId":     channelID,
			"textMessage":   rawMessageToObject(payload.TextMessage),
			"mediaMessage":  rawMessageToObject(payload.MediaMessage),
			"readMessage":   rawMessageToObject(payload.ReadMessage),
			"recallMessage": rawMessageToObject(payload.RecallMessage),
			"systemMessage": rawMessageToObject(payload.SystemMessage),
			"userId":        userID,
			"replyId":       rawMessageToScalarString(payload.ReplyID),
		}
		return json.Marshal(wsEnvelope{
			Event:     wsSendMessageEvent,
			RequestID: envelope.RequestID,
			Code:      0,
			Data:      mustMarshalRawMessage(responsePayload),
		})
	case "RECALL_MESSAGE":
		if payload.ContentType == "RECALL_MESSAGE" {
			responseData, err := h.recallMessage(ctx, payload)
			if err != nil {
				return nil, err
			}
			return json.Marshal(wsEnvelope{
				Event:     wsSendMessageEvent,
				RequestID: envelope.RequestID,
				Code:      0,
				Data:      mustMarshalRawMessage(responseData),
			})
		}
		return nil, errors.New("unsupported recall message payload")
	default:
		return nil, fmt.Errorf("unsupported contentType: %s", payload.ContentType)
	}
}

func (h *Hub) persistMessage(ctx context.Context, payload incomingMessage, userID, channelID string) (*outgoingMessage, error) {
	message := &model.Message{
		ContentType:   payload.ContentType,
		ChannelId:     channelID,
		RoomId:        channelID,
		TextMessage:   rawMessageToString(payload.TextMessage),
		MediaMessage:  rawMessageToString(payload.MediaMessage),
		ReadMessage:   rawMessageToString(payload.ReadMessage),
		RecallMessage: rawMessageToString(payload.RecallMessage),
		SystemMessage: rawMessageToString(payload.SystemMessage),
		UserId:        userID,
		ReplyId:       rawMessageToScalarString(payload.ReplyID),
	}

	savedMessage, err := h.messageService.SendMessage(ctx, message)
	if err != nil {
		return nil, err
	}

	user, err := h.lookupUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	return h.formatOutgoingMessage(ctx, savedMessage, user)
}

func (h *Hub) recallMessage(ctx context.Context, payload incomingMessage) (*outgoingMessage, error) {
	var recallBody struct {
		Operator    string          `json:"operator"`
		RecallMsgID json.RawMessage `json:"recallMsgId"`
	}
	if err := json.Unmarshal(payload.RecallMessage, &recallBody); err != nil {
		return nil, err
	}
	messageID, err := rawMessageToUint(recallBody.RecallMsgID)
	if err != nil {
		return nil, err
	}
	recalledMessage, err := h.messageService.RecallMessage(ctx, messageID, recallBody.Operator)
	if err != nil {
		return nil, err
	}
	user, err := h.lookupUser(ctx, recalledMessage.UserId)
	if err != nil {
		return nil, err
	}
	return h.formatOutgoingMessage(ctx, recalledMessage, user)
}

func (h *Hub) lookupUser(ctx context.Context, userID string) (*wsUser, error) {
	id, err := strconv.Atoi(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid userId: %s", userID)
	}
	user, err := h.userRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return &wsUser{
		ID:       user.ID,
		UserID:   strconv.Itoa(int(user.ID)),
		UserName: user.UserName,
		Image:    user.Image,
		Email:    user.Email,
		Bio:      user.Bio,
		QQ:       user.QQ,
		WeChat:   user.WeChat,
		Github:   user.Github,
	}, nil
}

func (h *Hub) formatOutgoingMessage(ctx context.Context, message *model.Message, user *wsUser) (*outgoingMessage, error) {
	response := &outgoingMessage{
		ID:            message.ID,
		CreatedAt:     message.CreatedAt,
		UpdatedAt:     message.UpdatedAt,
		Seq:           message.Seq,
		ContentType:   message.ContentType,
		ChannelID:     message.ChannelId,
		TextMessage:   rawStringToObject(message.TextMessage),
		MediaMessage:  rawStringToObject(message.MediaMessage),
		ReadMessage:   rawStringToObject(message.ReadMessage),
		RecallMessage: rawStringToObject(message.RecallMessage),
		SystemMessage: rawStringToObject(message.SystemMessage),
		UserID:        message.UserId,
		RoomID:        message.RoomId,
		ReplyID:       message.ReplyId,
		IsRecalled:    message.IsRecalled,
		User:          user,
	}

	if message.ReplyId != "" {
		replyID, err := strconv.ParseUint(message.ReplyId, 10, 64)
		if err == nil {
			replyMessage, replyErr := h.messageService.GetMessageByID(ctx, uint(replyID))
			if replyErr == nil {
				replyUser, userErr := h.lookupUser(ctx, replyMessage.UserId)
				if userErr == nil {
					replyResponse, formatErr := h.formatOutgoingMessage(ctx, replyMessage, replyUser)
					if formatErr == nil {
						response.Reply = replyResponse
					}
				}
			}
		}
	}

	return response, nil
}

func rawMessageToString(raw json.RawMessage) string {
	if len(raw) == 0 || string(raw) == "null" {
		return ""
	}
	return string(raw)
}

func rawMessageToScalarString(raw json.RawMessage) string {
	if len(raw) == 0 || string(raw) == "null" {
		return ""
	}
	var stringValue string
	if err := json.Unmarshal(raw, &stringValue); err == nil {
		return stringValue
	}
	var numericValue uint
	if err := json.Unmarshal(raw, &numericValue); err == nil {
		return strconv.Itoa(int(numericValue))
	}
	return string(raw)
}

func rawMessageToUint(raw json.RawMessage) (uint, error) {
	if len(raw) == 0 || string(raw) == "null" {
		return 0, errors.New("message id is required")
	}
	var numericValue uint
	if err := json.Unmarshal(raw, &numericValue); err == nil {
		return numericValue, nil
	}
	var stringValue string
	if err := json.Unmarshal(raw, &stringValue); err == nil {
		parsed, parseErr := strconv.ParseUint(stringValue, 10, 64)
		if parseErr != nil {
			return 0, parseErr
		}
		return uint(parsed), nil
	}
	return 0, errors.New("invalid message id")
}

func rawStringToObject(value string) interface{} {
	if value == "" {
		return nil
	}
	var object interface{}
	if err := json.Unmarshal([]byte(value), &object); err != nil {
		return nil
	}
	return object
}

func rawMessageToObject(raw json.RawMessage) interface{} {
	if len(raw) == 0 || string(raw) == "null" {
		return nil
	}
	var object interface{}
	if err := json.Unmarshal(raw, &object); err != nil {
		return nil
	}
	return object
}

func mustMarshalRawMessage(value interface{}) json.RawMessage {
	bytes, err := json.Marshal(value)
	if err != nil {
		return json.RawMessage(`null`)
	}
	return bytes
}

// 写循环：从 send 通道拿消息 -> 写给 WebSocket
func (c *Client) writePump() {
	defer func() {
		c.conn.Close()
	}()
	for message := range c.send {
		w, err := c.conn.NextWriter(websocket.TextMessage)
		if err != nil {
			return
		}
		w.Write(message)

		if err := w.Close(); err != nil {
			return
		}
	}
	// Hub 关闭了通道
	c.conn.WriteMessage(websocket.CloseMessage, []byte{})
}
