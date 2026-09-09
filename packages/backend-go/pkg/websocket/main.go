package ws

import (
	"log"
	"net/http"
	"strings"

	authjwt "backend-go/pkg/jwt"

	"github.com/gin-gonic/gin"
)

func ServeWs(hub *Hub, jwtService *authjwt.JWT, c *gin.Context) {
	requestedProtocol := strings.TrimSpace(strings.Split(c.GetHeader("Sec-WebSocket-Protocol"), ",")[0])
	token := c.GetHeader("Authorization")
	if token == "" {
		token = requestedProtocol
	}
	if token == "" {
		token = c.Query("accessToken")
	}
	claims, err := jwtService.ParseToken(token)
	if err != nil || claims.UserId == 0 {
		http.Error(c.Writer, "unauthorized", http.StatusUnauthorized)
		return
	}

	// 1. 升级 HTTP -> WebSocket
	responseHeader := http.Header{}
	if requestedProtocol != "" {
		// Browser clients send the JWT as a WebSocket subprotocol because the
		// WebSocket API cannot set an Authorization header. Echo the authenticated
		// protocol so browsers and development proxies accept the handshake.
		responseHeader.Set("Sec-WebSocket-Protocol", requestedProtocol)
	}
	conn, err := upgrader.Upgrade(c.Writer, c.Request, responseHeader)
	if err != nil {
		log.Println(err)
		return
	}

	// 2. 创建 Client 对象
	client := &Client{hub: hub, conn: conn, userID: uint(claims.UserId), send: make(chan []byte, 256)}

	// 3. 注册到 Hub
	client.hub.register <- client

	// 4. 启动读写协程
	go client.writePump()
	go client.readPump()
}
