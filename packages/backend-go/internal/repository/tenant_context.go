package repository

import "context"

type tenantContextKey struct{}

func WithTenantID(ctx context.Context, tenantID uint) context.Context {
	return context.WithValue(ctx, tenantContextKey{}, tenantID)
}

func TenantIDFromContext(ctx context.Context) uint {
	value, _ := ctx.Value(tenantContextKey{}).(uint)
	return value
}
