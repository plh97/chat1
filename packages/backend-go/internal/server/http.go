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
	"context"

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
	tenantHandler *handler.TenantHandler,
	userRepo repository.UserRepository,
	messageService service.MessageService,
	roomService service.RoomService,
	migrate *Migrate,
) *http.Server {
	// Run additive, non-reset migrations before accepting requests. This keeps
	// existing installations usable when a hot reload introduces tenant-aware
	// authorization that depends on the new tables and columns.
	if err := migrate.Run(context.Background()); err != nil {
		panic(err)
	}
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
			noAuthRouter.GET("/userImage", userHandler.GetUserImage)
		}
		// Strict permission routing group
		tenantSessions := userRepo.(repository.TenantSessionRepository)
		platformRoles := userRepo.(repository.PlatformRoleRepository)
		strictAuthRouter := v1.Group("/").Use(middleware.StrictAuth(jwt, logger), middleware.ActiveTenant(tenantSessions))
		{
			strictAuthRouter.GET("/profile", userHandler.GetCurrentProfile)
			strictAuthRouter.GET("/user", userHandler.ListUsers)
			strictAuthRouter.PUT("/profile", userHandler.UpdateProfile)
			strictAuthRouter.POST("/upload", userHandler.Upload)
			strictAuthRouter.POST("/friend", userHandler.AddFriend)
			strictAuthRouter.DELETE("/friend", userHandler.DeleteFriend)
			strictAuthRouter.POST("/room", roomHandler.AddRoom)
			strictAuthRouter.GET("/room", roomHandler.GetRoom)
			strictAuthRouter.GET("/room/messages", roomHandler.GetRoomMessages)
			strictAuthRouter.GET("/room/messages/cursor", roomHandler.GetRoomMessagesByCursor)
			strictAuthRouter.GET("/room/messages/search", roomHandler.SearchRoomMessages)
			strictAuthRouter.GET("/room/member", roomHandler.GetRoomMembers)
			strictAuthRouter.GET("/room/message/readers", roomHandler.GetMessageReaders)
			strictAuthRouter.PATCH("/room", roomHandler.UpdateRoom)
			strictAuthRouter.DELETE("/room", roomHandler.DeleteRoom)
			strictAuthRouter.POST("/joinRoom", roomHandler.JoinRoom)
			strictAuthRouter.GET("/room/message", roomHandler.GetMessage)
			strictAuthRouter.DELETE("/room/message", roomHandler.DeleteMessage)
		}
		platformRouter := v1.Group("/platform").Use(middleware.StrictAuth(jwt, logger), middleware.ActiveTenant(tenantSessions), middleware.PlatformAdmin(platformRoles))
		{
			platformRouter.GET("/overview", tenantHandler.Overview)
			platformRouter.GET("/tenants", tenantHandler.List)
			platformRouter.POST("/tenants", tenantHandler.Create)
			platformRouter.GET("/tenants/:id", tenantHandler.Get)
			platformRouter.PATCH("/tenants/:id", tenantHandler.Update)
			platformRouter.DELETE("/tenants/:id", tenantHandler.Archive)
			platformRouter.GET("/users", tenantHandler.ListUsers)
			platformRouter.POST("/tenants/:id/users", tenantHandler.CreateUser)
			platformRouter.PATCH("/users/:id", tenantHandler.UpdateUser)
			platformRouter.DELETE("/users/:id", tenantHandler.DeleteUser)
			platformRouter.GET("/system", tenantHandler.System)
		}
	}
	// websocketのupgraderを定期
	hub := ws.NewHub(messageService, userRepo)
	userHandler.SetRoomEventPublisher(hub)
	userHandler.SetUserEventPublisher(hub)
	roomHandler.SetRoomEventPublisher(hub)
	tenantHandler.SetSessionInvalidator(hub)
	s.GET("/ws", func(c *gin.Context) {
		ws.ServeWs(hub, jwt, c)
	})
	// Start hub's event loop in a goroutine
	go hub.Run()
	return s
}
