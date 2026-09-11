package handler

import (
	v1 "backend-go/api/v1"
	"backend-go/internal/service"
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type TenantHandler struct {
	*Handler
	tenantService      service.TenantService
	sessionInvalidator TenantSessionInvalidator
}

type TenantSessionInvalidator interface {
	DisconnectUser(userID uint)
	DisconnectTenant(tenantID uint)
}

func NewTenantHandler(handler *Handler, tenantService service.TenantService) *TenantHandler {
	return &TenantHandler{Handler: handler, tenantService: tenantService}
}

func (h *TenantHandler) SetSessionInvalidator(invalidator TenantSessionInvalidator) {
	h.sessionInvalidator = invalidator
}

func (h *TenantHandler) List(ctx *gin.Context) {
	pageSize, _ := strconv.Atoi(ctx.DefaultQuery("pageSize", "20"))
	start, _ := strconv.Atoi(ctx.DefaultQuery("start", "0"))
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	if start < 0 {
		start = 0
	}
	result, err := h.tenantService.List(ctx, ctx.Query("q"), ctx.Query("status"), pageSize, start)
	if err != nil {
		v1.HandleError(ctx, http.StatusInternalServerError, err, nil)
		return
	}
	v1.HandleSuccess(ctx, result)
}

func (h *TenantHandler) Overview(ctx *gin.Context) {
	result, err := h.tenantService.Overview(ctx)
	if err != nil {
		v1.HandleError(ctx, http.StatusInternalServerError, err, nil)
		return
	}
	v1.HandleSuccess(ctx, result)
}

func (h *TenantHandler) ListUsers(ctx *gin.Context) {
	tenantID, _ := strconv.ParseUint(ctx.Query("tenantId"), 10, 64)
	pageSize, _ := strconv.Atoi(ctx.DefaultQuery("pageSize", "50"))
	start, _ := strconv.Atoi(ctx.DefaultQuery("start", "0"))
	if pageSize < 1 || pageSize > 100 {
		pageSize = 50
	}
	if start < 0 {
		start = 0
	}
	result, err := h.tenantService.ListUsers(ctx, uint(tenantID), ctx.Query("q"), ctx.Query("status"), pageSize, start)
	if err != nil {
		v1.HandleError(ctx, http.StatusInternalServerError, err, nil)
		return
	}
	v1.HandleSuccess(ctx, result)
}

func (h *TenantHandler) CreateUser(ctx *gin.Context) {
	tenantID, ok := tenantIDParam(ctx)
	if !ok {
		return
	}
	var req v1.CreateTenantUserRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, err.Error())
		return
	}
	result, err := h.tenantService.CreateUser(ctx, tenantID, req)
	if err != nil {
		handleTenantError(ctx, err)
		return
	}
	v1.HandleSuccess(ctx, result, "User created successfully")
}

func (h *TenantHandler) UpdateUser(ctx *gin.Context) {
	userID, ok := tenantIDParam(ctx)
	if !ok {
		return
	}
	var req v1.UpdateTenantUserRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, err.Error())
		return
	}
	result, err := h.tenantService.UpdateUser(ctx, userID, req)
	if err != nil {
		handleTenantError(ctx, err)
		return
	}
	if h.sessionInvalidator != nil && result.Status != "active" {
		h.sessionInvalidator.DisconnectUser(userID)
	}
	v1.HandleSuccess(ctx, result, "User updated successfully")
}

func (h *TenantHandler) DeleteUser(ctx *gin.Context) {
	userID, ok := tenantIDParam(ctx)
	if !ok {
		return
	}
	if err := h.tenantService.DeleteUser(ctx, userID); err != nil {
		handleTenantError(ctx, err)
		return
	}
	if h.sessionInvalidator != nil {
		h.sessionInvalidator.DisconnectUser(userID)
	}
	v1.HandleSuccess(ctx, map[string]uint{"id": userID}, "User deleted successfully")
}

func (h *TenantHandler) System(ctx *gin.Context) {
	result, err := h.tenantService.System(ctx)
	if err != nil {
		v1.HandleError(ctx, http.StatusServiceUnavailable, err, nil)
		return
	}
	v1.HandleSuccess(ctx, result)
}

func (h *TenantHandler) Get(ctx *gin.Context) {
	id, ok := tenantIDParam(ctx)
	if !ok {
		return
	}
	result, err := h.tenantService.Get(ctx, id)
	if err != nil {
		handleTenantError(ctx, err)
		return
	}
	v1.HandleSuccess(ctx, result)
}

func (h *TenantHandler) Create(ctx *gin.Context) {
	var req v1.CreateTenantRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, err.Error())
		return
	}
	result, err := h.tenantService.Create(ctx, req)
	if err != nil {
		handleTenantError(ctx, err)
		return
	}
	v1.HandleSuccess(ctx, result, "Tenant created successfully")
}

func (h *TenantHandler) Update(ctx *gin.Context) {
	id, ok := tenantIDParam(ctx)
	if !ok {
		return
	}
	var req v1.UpdateTenantRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, err.Error())
		return
	}
	result, err := h.tenantService.Update(ctx, id, req)
	if err != nil {
		handleTenantError(ctx, err)
		return
	}
	if h.sessionInvalidator != nil && result.Status != "active" && result.Status != "trial" {
		h.sessionInvalidator.DisconnectTenant(id)
	}
	v1.HandleSuccess(ctx, result, "Tenant updated successfully")
}

func (h *TenantHandler) Archive(ctx *gin.Context) {
	id, ok := tenantIDParam(ctx)
	if !ok {
		return
	}
	if err := h.tenantService.Archive(ctx, id); err != nil {
		handleTenantError(ctx, err)
		return
	}
	if h.sessionInvalidator != nil {
		h.sessionInvalidator.DisconnectTenant(id)
	}
	v1.HandleSuccess(ctx, map[string]uint{"id": id}, "Tenant archived successfully")
}

func tenantIDParam(ctx *gin.Context) (uint, bool) {
	value, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil || value == 0 {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, "invalid tenant id")
		return 0, false
	}
	return uint(value), true
}

func handleTenantError(ctx *gin.Context, err error) {
	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		v1.HandleError(ctx, http.StatusNotFound, v1.ErrNotFound, nil)
	case errors.Is(err, service.ErrTenantConflict):
		v1.HandleError(ctx, http.StatusConflict, v1.ErrBadRequest, err.Error())
	default:
		v1.HandleError(ctx, http.StatusBadRequest, err, nil)
	}
}
