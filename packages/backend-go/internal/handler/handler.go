package handler

import (
	"backend-go/pkg/jwt"
	"backend-go/pkg/log"
	"github.com/gin-gonic/gin"
	"github.com/topfreegames/pitaya/v2"
	"github.com/topfreegames/pitaya/v2/component"
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

func GetTenantIdFromCtx(ctx *gin.Context) uint {
	v, exists := ctx.Get("claims")
	if !exists {
		return 0
	}
	claims, ok := v.(*jwt.MyCustomClaims)
	if !ok {
		return 0
	}
	return claims.TenantId
}
