package handler

import (
	v1 "backend-go/api/v1"
	"backend-go/internal/service"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type UserHandler struct {
	*Handler
	userService service.UserService
}

func NewUserHandler(handler *Handler, userService service.UserService) *UserHandler {
	return &UserHandler{
		Handler:     handler,
		userService: userService,
	}
}

// Register godoc
// @Summary 用户注册
// @Schemes
// @Description 目前只支持邮箱登录
// @Tags 用户模块
// @Accept json
// @Produce json
// @Param request body v1.RegisterRequest true "params"
// @Success 200 {object} v1.Response
// @Router /register [post]
func (h *UserHandler) Register(ctx *gin.Context) {
	req := new(v1.RegisterRequest)
	if err := ctx.ShouldBindJSON(req); err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}

	if err := h.userService.Register(ctx, req); err != nil {
		h.logger.WithContext(ctx).Error("userService.Register error", zap.Error(err))
		if err == v1.ErrEmailAlreadyUse {
			v1.HandleError(ctx, http.StatusBadRequest, err, nil)
		} else {
			v1.HandleError(ctx, http.StatusInternalServerError, err, nil)
		}
		return
	}

	v1.HandleSuccess(ctx, nil, "User registered successfully")
}

// Login godoc
// @Summary 账号登录
// @Schemes
// @Description
// @Tags 用户模块
// @Accept json
// @Produce json
// @Param request body v1.LoginRequest true "params"
// @Success 200 {object} v1.LoginResponse
// @Router /login [post]
func (h *UserHandler) Login(ctx *gin.Context) {
	var req v1.LoginRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}

	token, err := h.userService.Login(ctx, &req)
	if err != nil {
		v1.HandleError(ctx, http.StatusUnauthorized, err, nil)
		return
	}
	v1.HandleSuccess(ctx, v1.LoginResponseData{
		AccessToken: token,
	}, "Login successful")
}

// Logout godoc
// @Summary 账号logout
// @Schemes
// @Description 用户登出
// @Tags 用户模块
// @Accept json
// @Produce json
// @Security Bearer
// @Success 200 {object} v1.Response
// @Router /logout [post]
func (h *UserHandler) Logout(ctx *gin.Context) {
	if err := h.userService.Logout(ctx); err != nil {
		v1.HandleError(ctx, http.StatusInternalServerError, err, nil)
		return
	}
	v1.HandleSuccess(ctx, v1.LogoutResponseData{
		Message: "logout successfully",
	}, "Logout successful")
}

// GetCurrentProfile godoc
// @Summary 获取当前用户信息
// @Schemes
// @Description
// @Tags 用户模块
// @Accept json
// @Produce json
// @Security Bearer
// @Success 200 {object} v1.GetProfileResponse
// @Router /profile [get]
func (h *UserHandler) GetCurrentProfile(ctx *gin.Context) {
	userId := GetUserIdFromCtx(ctx)
	if userId == 0 {
		v1.HandleError(ctx, http.StatusUnauthorized, v1.ErrEmptyUserId, nil)
		return
	}

	user, err := h.userService.GetProfile(ctx, int(userId))
	if err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}

	v1.HandleSuccess(ctx, user)
}

// ListUsers godoc
// @Summary 获取用户列表
// @Schemes
// @Description 获取用户列表，支持按ID、用户名、邮箱等过滤
// @Tags 用户模块
// @Accept json
// @Produce json
// @Param id query int false "用户ID"
// @Param username query string false "用户名搜索"
// @Param email query string false "邮箱搜索"
// @Success 200 {object} v1.Response
// @Router /user [get]
func (h *UserHandler) ListUsers(ctx *gin.Context) {

	var req v1.ListUsersRequest
	if err := ctx.ShouldBindQuery(&req); err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}

	users, err := h.userService.ListUsers(ctx, req)
	if err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}

	v1.HandleSuccess(ctx, users)
}

func (h *UserHandler) UpdateProfile(ctx *gin.Context) {
	userId := GetUserIdFromCtx(ctx)

	var req v1.UpdateProfileRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequestParamsNotEnough, nil)
		return
	}

	user, err := h.userService.UpdateProfile(ctx, userId, &req)
	if err != nil {
		v1.HandleError(ctx, http.StatusInternalServerError, v1.ErrInternalServerError, nil)
		return
	}

	v1.HandleSuccess(ctx, user, "Profile updated successfully")
}

// Upload godoc
// @Summary 上传图片
// @Schemes
// @Tags 用户模块
// @Accept multipart/form-data
// @Produce json
// @Param file formData file true "file"
// @Success 200 {object} v1.Response
// @Router /upload [post]
func (h *UserHandler) Upload(ctx *gin.Context) {
	var req v1.UploadPresignedUrlRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}

	preSignedUrl, endpointUrl, err := h.userService.UploadPresignedUrl(req.FileExt, req.UploadScene)

	if err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}

	v1.HandleSuccess(ctx, v1.UploadPresignedUrlResponseData{
		PreSignedUrl: preSignedUrl,
		EndpointUrl:  endpointUrl,
	})
}

// AddFriend godoc
// @Summary 添加好友
// @Schemes
// @Description 添加另一个用户为好友
// @Tags 用户模块
// @Accept json
// @Produce json
// @Security Bearer
// @Param request body v1.AddFriendRequest true "params"
// @Success 200 {object} v1.Response
// @Router /friend [post]
func (h *UserHandler) AddFriend(ctx *gin.Context) {
	userId := GetUserIdFromCtx(ctx)
	if userId == 0 {
		v1.HandleError(ctx, http.StatusUnauthorized, v1.ErrEmptyUserId, nil)
		return
	}

	req := new(v1.AddFriendRequest)
	if err := ctx.ShouldBindJSON(req); err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, err, nil)
		return
	}

	if err := h.userService.AddFriend(ctx, uint(userId), req); err != nil {
		h.logger.WithContext(ctx).Error("userService.AddFriend error", zap.Error(err))
		v1.HandleError(ctx, http.StatusBadRequest, err, nil)
		return
	}

	v1.HandleSuccess(ctx, nil, "Friend added successfully")
}

// DeleteFriend godoc
// @Summary 删除好友
// @Schemes
// @Description 删除一个已添加的好友
// @Tags 用户模块
// @Accept json
// @Produce json
// @Security Bearer
// @Param request body v1.DeleteFriendRequest true "params"
// @Success 200 {object} v1.Response
// @Router /friend [delete]
func (h *UserHandler) DeleteFriend(ctx *gin.Context) {
	userId := GetUserIdFromCtx(ctx)
	if userId == 0 {
		v1.HandleError(ctx, http.StatusUnauthorized, v1.ErrEmptyUserId, nil)
		return
	}

	req := new(v1.DeleteFriendRequest)
	if err := ctx.ShouldBindJSON(req); err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}

	if err := h.userService.DeleteFriend(ctx, uint(userId), req); err != nil {
		h.logger.WithContext(ctx).Error("userService.DeleteFriend error", zap.Error(err))
		v1.HandleError(ctx, http.StatusBadRequest, err, nil)
		return
	}

	v1.HandleSuccess(ctx, nil, "Friend removed successfully")
}

// GetUserImage godoc
// @Summary 获取用户头像
// @Schemes
// @Tags 用户模块
// @Accept json
// @Produce json
// @Param username query string true "用户名"
// @Success 200 {object} v1.Response
// @Router /userImage [get]
func (h *UserHandler) GetUserImage(ctx *gin.Context) {
	// TODO: 实现获取用户头像逻辑
	v1.HandleSuccess(ctx, map[string]interface{}{"msg": "not implemented"})
}
