package jwt

import (
	"testing"
	"time"

	"github.com/spf13/viper"
	"github.com/stretchr/testify/require"
)

func TestTenantClaimsRoundTrip(t *testing.T) {
	config := viper.New()
	config.Set("security.jwt.key", "tenant-test-secret")
	service := NewJwt(config)
	token, err := service.GenTenantToken(7, 42, "platform_admin", time.Now().Add(time.Hour))
	require.NoError(t, err)
	claims, err := service.ParseToken(token)
	require.NoError(t, err)
	require.Equal(t, 7, claims.UserId)
	require.Equal(t, uint(42), claims.TenantId)
	require.Equal(t, "platform_admin", claims.PlatformRole)
}
