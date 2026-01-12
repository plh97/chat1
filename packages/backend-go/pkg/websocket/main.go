package ws

import (
	"log"

	"github.com/gin-gonic/gin"
)

func ServeWs(hub *Hub, c *gin.Context) {
	// 1. 升级 HTTP -> WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println(err)
		return
	}

	// 2. 创建 Client 对象
	client := &Client{hub: hub, conn: conn, send: make(chan []byte, 256)}

	// 3. 注册到 Hub
	client.hub.register <- client

	// 4. 启动读写协程
	go client.writePump()
	go client.readPump()
}
