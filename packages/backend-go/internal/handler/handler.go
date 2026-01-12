package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/topfreegames/pitaya/v2"
	"github.com/topfreegames/pitaya/v2/component"
	"backend-go/pkg/jwt"
	"backend-go/pkg/log"
)

type Handler struct {
	logger *log.Logger
	component.Base
	app pitaya.Pitaya
}

func NewHandler(
	logger *log.Logger,
	app pitaya.Pitaya,
) *Handler {
	return &Handler{
		logger: logger,
		app:    app,
	}
}
func GetUserIdFromCtx(ctx *gin.Context) int {
	v, exists := ctx.Get("claims")
	if !exists {
		return 0
	}
	return v.(*jwt.MyCustomClaims).UserId
}
