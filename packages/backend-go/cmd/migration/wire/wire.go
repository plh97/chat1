//go:build wireinject
// +build wireinject

package wire

import (
	"backend-go/internal/repository"
	"backend-go/internal/server"
	"backend-go/pkg/log"
	"github.com/google/wire"
	"github.com/spf13/viper"
)

var migrationSet = wire.NewSet(
	repository.NewDB,
	server.NewMigrate,
)

func NewWire(*viper.Viper, *log.Logger) (*server.Migrate, func(), error) {
	panic(wire.Build(
		migrationSet,
	))
}
