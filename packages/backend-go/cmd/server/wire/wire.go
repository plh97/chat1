//go:build wireinject
// +build wireinject

package wire

import (
	"github.com/google/wire"
	"github.com/spf13/viper"
	"backend-go/internal/handler"
	"backend-go/internal/repository"
	"backend-go/internal/server"
	"backend-go/internal/service"
	"backend-go/pkg/app"
	"backend-go/pkg/aws"
	"backend-go/pkg/jwt"
	"backend-go/pkg/log"
	"backend-go/pkg/server/http"
	"backend-go/pkg/sid"
)

var repositorySet = wire.NewSet(
	repository.NewDB,
	//repository.NewRedis,
	repository.NewRepository,
	repository.NewTransaction,
	repository.NewUserRepository,
	repository.NewFriendRepository,
	repository.NewMessageRepository,
)

var serviceSet = wire.NewSet(
	service.NewService,
	service.NewUserService,
	service.NewRoomService,
	service.NewMessageService,
)

var handlerSet = wire.NewSet(
	handler.NewHandler,
	handler.NewUserHandler,
	handler.NewRoomHandler,
)

var serverSet = wire.NewSet(
	server.NewHTTPServer,
	server.NewJob,
)

// build App
func newApp(
	httpServer *http.Server,
	job *server.Job,
) *app.App {
	return app.NewApp(
		app.WithServer(httpServer, job),
		app.WithName("demo-server"),
	)
}


// 声明 R2 构造函数
var awsSet = wire.NewSet(
	aws.NewR2Client, // Wire 会自动处理 *viper.Viper 和 *log.Logger 的注入
)

func NewWire(*viper.Viper, *log.Logger) (*app.App, func(), error) {
	panic(wire.Build(
		repositorySet,
		serviceSet,
		handlerSet,
		serverSet,
		sid.NewSid,
		jwt.NewJwt,
		awsSet,
		server.NewPitaya,
		newApp,
	))
}
