package server

import (
	apiV1 "backend-go/api/v1"
	"backend-go/docs"
	"backend-go/internal/handler"
	"backend-go/internal/middleware"
	"backend-go/internal/repository"
	"backend-go/internal/service"
	"backend-go/pkg/jwt"
	"backend-go/pkg/log"
	"backend-go/pkg/server/http"

	ws "backend-go/pkg/websocket"

	"github.com/gin-gonic/gin"
	"github.com/spf13/viper"
	swaggerfiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

func NewHTTPServer(
	logger *log.Logger,
	conf *viper.Viper,
	jwt *jwt.JWT,
	userHandler *handler.UserHandler,
	roomHandler *handler.RoomHandler,
	userRepo repository.UserRepository,
	messageService service.MessageService,
	roomService service.RoomService,
) *http.Server {
	gin.SetMode(gin.DebugMode)
	s := http.NewServer(
		gin.Default(),
		logger,
		http.WithServerHost(conf.GetString("http.host")),
		http.WithServerPort(conf.GetInt("http.port")),
	)
	// swagger doc
	docs.SwaggerInfo.BasePath = "/v1"
	s.GET("/swagger/*any", ginSwagger.WrapHandler(
		swaggerfiles.Handler,
		//ginSwagger.URL(fmt.Sprintf("http://localhost:%d/swagger/doc.json", conf.GetInt("app.http.port"))),
		ginSwagger.DefaultModelsExpandDepth(-1),
	))

	s.Use(
		middleware.CORSMiddleware(),
		middleware.ResponseLogMiddleware(logger),
		middleware.RequestLogMiddleware(logger),
		//middleware.SignMiddleware(log),
	)
	s.GET("/", func(ctx *gin.Context) {
		logger.WithContext(ctx).Info("hello")
		apiV1.HandleSuccess(ctx, map[string]interface{}{
			":)": "Thank you for using nunu!",
		})
	})
	v1 := s.Group("/v1")
	{
		// No route group has permission
		noAuthRouter := v1.Group("/")
		{
			noAuthRouter.POST("/register", userHandler.Register)
			noAuthRouter.POST("/login", userHandler.Login)
			noAuthRouter.POST("/logout", userHandler.Logout)
			noAuthRouter.POST("/upload", userHandler.Upload)
		}
		// Non-strict permission routing group
		noStrictAuthRouter := v1.Group("/").Use(middleware.NoStrictAuth(jwt, logger))
		{
			noStrictAuthRouter.GET("/profile", userHandler.GetCurrentProfile)
			noStrictAuthRouter.GET("/user", userHandler.ListUsers)
			noStrictAuthRouter.GET("/userImage", userHandler.GetUserImage)
		}

		// Strict permission routing group
		strictAuthRouter := v1.Group("/").Use(middleware.StrictAuth(jwt, logger))
		{
			strictAuthRouter.PUT("/profile", userHandler.UpdateProfile)
			strictAuthRouter.POST("/friend", userHandler.AddFriend)
			strictAuthRouter.DELETE("/friend", userHandler.DeleteFriend)
			strictAuthRouter.POST("/room", roomHandler.AddRoom)
			strictAuthRouter.GET("/room", roomHandler.GetRoom)
			strictAuthRouter.GET("/room/messages", roomHandler.GetRoomMessages)
			strictAuthRouter.GET("/room/member", roomHandler.GetRoomMembers)
			strictAuthRouter.PATCH("/room", roomHandler.UpdateRoom)
			strictAuthRouter.DELETE("/room", roomHandler.DeleteRoom)
			strictAuthRouter.POST("/joinRoom", roomHandler.JoinRoom)
			strictAuthRouter.GET("/room/message", roomHandler.GetMessage)
			strictAuthRouter.DELETE("/room/message", roomHandler.DeleteMessage)
		}
	}
	// websocket up grader 定期
	hub := ws.NewHub(messageService, userRepo)
	s.GET("/ws", func(c *gin.Context) {
		ws.ServeWs(hub, c)
	})
	s.GET("/ws/ws", func(c *gin.Context) {
		ws.ServeWs(hub, c)
	})
	// Start hub's event loop in a goroutine
	go hub.Run()
	return s
}
