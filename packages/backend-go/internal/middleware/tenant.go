package middleware

import (
	v1 "backend-go/api/v1"
	"backend-go/internal/repository"
	authjwt "backend-go/pkg/jwt"
	"net/http"

	"github.com/gin-gonic/gin"
)

func ActiveTenant(users repository.TenantSessionRepository) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		claims, ok := ctx.Get("claims")
		user, validClaims := claims.(*authjwt.MyCustomClaims)
		if !ok || !validClaims || user.TenantId == 0 {
			v1.HandleError(ctx, http.StatusForbidden, v1.ErrUnauthorized, nil)
			ctx.Abort()
			return
		}
		active, err := users.IsTenantSessionActive(ctx, uint(user.UserId), user.TenantId)
		if err != nil || !active {
			v1.HandleError(ctx, http.StatusForbidden, v1.ErrUnauthorized, nil)
			ctx.Abort()
			return
		}
		ctx.Next()
	}
}
