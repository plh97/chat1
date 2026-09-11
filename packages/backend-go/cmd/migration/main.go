package main

import (
	"context"
	"flag"

	"backend-go/cmd/migration/wire"
	"backend-go/pkg/config"
	"backend-go/pkg/log"
)

func main() {
	var envConf = flag.String("conf", "config/local.yml", "config path, eg: -conf ./config/local.yml")
	var reset = flag.Bool("reset", false, "drop all application tables and load development seed data")
	flag.Parse()
	conf := config.NewConfig(*envConf)
	conf.Set("migration.reset", *reset)

	logger := log.NewLog(conf)

	migration, cleanup, err := wire.NewWire(conf, logger)
	if err != nil {
		panic(err)
	}
	defer cleanup()
	if err = migration.Run(context.Background()); err != nil {
		panic(err)
	}
}
