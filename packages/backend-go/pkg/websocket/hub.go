package ws

import (
	"backend-go/internal/repository"
	"backend-go/internal/service"
	"encoding/json"
	"log"
)

const wsRoomListChangedEvent = "WS_ROOM_LIST_CHANGED"

type targetedMessage struct {
	userIDs map[uint]struct{}
	payload []byte
}

type Hub struct {
	messageService service.MessageService
	userRepo       repository.UserRepository
	// 注册了的客户端 map[客户端指针]布尔值
	clients map[*Client]bool
	// 广播通道
	broadcast chan []byte
	// 按用户推送通道
	targeted chan targetedMessage
	// 注册通道
	register chan *Client
	// 注销通道
	unregister chan *Client
}

func NewHub(messageService service.MessageService, userRepo repository.UserRepository) *Hub {
	return &Hub{
		messageService: messageService,
		userRepo:       userRepo,
		broadcast:      make(chan []byte),
		targeted:       make(chan targetedMessage, 256),
		register:       make(chan *Client),
		unregister:     make(chan *Client),
		clients:        make(map[*Client]bool),
	}
}

// Hub 的核心循环：处理注册、注销、广播
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
			log.Printf("Client connected. Total: %d", len(h.clients))
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				log.Printf("Client disconnected. Total: %d", len(h.clients))
			}
		case message := <-h.broadcast:
			log.Printf("Broadcasting message to %d clients", len(h.clients))
			// 广播消息给所有人
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
		case message := <-h.targeted:
			for client := range h.clients {
				if _, shouldReceive := message.userIDs[client.userID]; !shouldReceive {
					continue
				}
				select {
				case client.send <- message.payload:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
		}
	}
}

func (h *Hub) NotifyRoomListChanged(userIDs []uint) {
	targets := make(map[uint]struct{}, len(userIDs))
	for _, userID := range userIDs {
		if userID != 0 {
			targets[userID] = struct{}{}
		}
	}
	if len(targets) == 0 {
		return
	}

	payload, err := json.Marshal(wsEnvelope{
		Event: wsRoomListChangedEvent,
		Code:  0,
		Data:  json.RawMessage(`{}`),
	})
	if err != nil {
		log.Printf("marshal room list change event failed: %v", err)
		return
	}
	h.targeted <- targetedMessage{userIDs: targets, payload: payload}
}
