package ws

import (
	"backend-go/internal/repository"
	"backend-go/internal/service"
	"log"
)

type Hub struct {
	messageService service.MessageService
	userRepo       repository.UserRepository
	// 注册了的客户端 map[客户端指针]布尔值
	clients map[*Client]bool
	// 广播通道
	broadcast chan []byte
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
		}
	}
}
