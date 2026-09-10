package ws

import (
	"backend-go/internal/repository"
	"backend-go/internal/service"
	"context"
	"encoding/json"
	"log"
	"strconv"
)

const wsRoomListChangedEvent = "WS_ROOM_LIST_CHANGED"
const wsUserUpdatedEvent = "WS_USER_UPDATED"

type userUpdatedPayload struct {
	ID       string `json:"id"`
	UserName string `json:"userName"`
	Image    string `json:"image"`
}

type targetedMessage struct {
	userIDs map[uint]struct{}
	payload []byte
}

type Hub struct {
	messageService service.MessageService
	userRepo       repository.UserRepository
	// Registered clients, also indexed by authenticated user for targeted sends.
	clients       map[*Client]bool
	clientsByUser map[uint]map[*Client]struct{}
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
		targeted:       make(chan targetedMessage, 256),
		register:       make(chan *Client),
		unregister:     make(chan *Client),
		clients:        make(map[*Client]bool),
		clientsByUser:  make(map[uint]map[*Client]struct{}),
	}
}

func (h *Hub) registerClient(client *Client) {
	h.clients[client] = true
	userClients := h.clientsByUser[client.userID]
	if userClients == nil {
		userClients = make(map[*Client]struct{})
		h.clientsByUser[client.userID] = userClients
	}
	userClients[client] = struct{}{}
}

func (h *Hub) unregisterClient(client *Client) {
	if _, ok := h.clients[client]; !ok {
		return
	}
	delete(h.clients, client)
	if userClients := h.clientsByUser[client.userID]; userClients != nil {
		delete(userClients, client)
		if len(userClients) == 0 {
			delete(h.clientsByUser, client.userID)
		}
	}
	close(client.send)
}

func (h *Hub) deliverTargeted(message targetedMessage) {
	for userID := range message.userIDs {
		for client := range h.clientsByUser[userID] {
			select {
			case client.send <- message.payload:
			default:
				h.unregisterClient(client)
			}
		}
	}
}

// Hub 的核心循环：处理注册、注销、广播
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.registerClient(client)
			log.Printf("Client connected. Total: %d", len(h.clients))
		case client := <-h.unregister:
			h.unregisterClient(client)
			log.Printf("Client disconnected. Total: %d", len(h.clients))
		case message := <-h.targeted:
			h.deliverTargeted(message)
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

func (h *Hub) NotifyUserUpdated(ctx context.Context, userID uint, userName, image string) {
	if userID == 0 {
		return
	}

	targets := map[uint]struct{}{userID: {}}
	if audienceRepo, ok := h.userRepo.(repository.ProfileAudienceRepository); ok {
		userIDs, err := audienceRepo.ListProfileAudienceUserIDs(ctx, userID)
		if err != nil {
			// The profile was already saved. Keep the HTTP request successful and
			// at least update every active session owned by the editor.
			log.Printf("resolve profile update audience failed: %v", err)
		} else {
			for _, audienceUserID := range userIDs {
				if audienceUserID != 0 {
					targets[audienceUserID] = struct{}{}
				}
			}
		}
	}

	id := strconv.FormatUint(uint64(userID), 10)
	data, err := json.Marshal(userUpdatedPayload{
		ID:       id,
		UserName: userName,
		Image:    image,
	})
	if err != nil {
		log.Printf("marshal profile update data failed: %v", err)
		return
	}
	payload, err := json.Marshal(wsEnvelope{
		Event: wsUserUpdatedEvent,
		Code:  0,
		Data:  data,
	})
	if err != nil {
		log.Printf("marshal profile update event failed: %v", err)
		return
	}
	h.targeted <- targetedMessage{userIDs: targets, payload: payload}
}
