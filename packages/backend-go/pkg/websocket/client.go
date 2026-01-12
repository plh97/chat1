package ws

import (
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

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
		// 把读到的消息塞入广播通道
		c.hub.broadcast <- message
	}
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
