package middleware

import (
	v1 "backend-go/api/v1"
	"backend-go/internal/repository"
	authjwt "backend-go/pkg/jwt"
	"net/http"

	"github.com/gin-gonic/gin"
)

func PlatformAdmin(users repository.PlatformRoleRepository) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		claims, ok := ctx.Get("claims")
		if !ok {
			v1.HandleError(ctx, http.StatusUnauthorized, v1.ErrUnauthorized, nil)
			ctx.Abort()
			return
		}
		user, ok := claims.(*authjwt.MyCustomClaims)
		if !ok {
			v1.HandleError(ctx, http.StatusForbidden, v1.ErrUnauthorized, nil)
			ctx.Abort()
			return
		}
		allowed, err := users.IsPlatformAdministrator(ctx, uint(user.UserId), user.TenantId)
		if err != nil || !allowed {
			v1.HandleError(ctx, http.StatusForbidden, v1.ErrUnauthorized, nil)
			ctx.Abort()
			return
		}
		ctx.Next()
	}
}
