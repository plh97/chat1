package handler

import (
	v1 "backend-go/api/v1"
	"backend-go/internal/service"
	"context"
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/topfreegames/pitaya/v2"
	"github.com/topfreegames/pitaya/v2/timer"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type RoomHandler struct {
	*Handler
	timer       *timer.Timer
	roomService service.RoomService
}

func NewRoomHandler(
	handler *Handler,
	roomService service.RoomService,
) *RoomHandler {
	return &RoomHandler{
		Handler:     handler,
		roomService: roomService,
	}
}

// AfterInit component lifetime callback
func (h *RoomHandler) AfterInit() {
	h.logger.Debug("AfterInit")

	// TODO: You shouldn't create a room here, this line of code is just for the convenience of demonstration
	h.Create(context.Background(), nil)

	h.timer = pitaya.NewTimer(time.Second*3, func() {
		count, err := h.app.GroupCountMembers(context.Background(), "test-room")
		if err != nil {
			h.logger.Error("AfterInit error", zap.Error(err))
			return
		}
		h.logger.Debug("AfterInit", zap.Any("userCount", count))
	})
}

// Create room
func (h *RoomHandler) Create(ctx context.Context, msg []byte) (*v1.Response, error) {
	err := h.app.GroupCreate(context.Background(), "test-room")
	if err != nil {
		h.logger.WithContext(ctx)
	}
	return &v1.Response{
		Code:    0,
		Message: "success",
		Data:    nil,
	}, nil
}

// AddRoom godoc
// @Summary 创建房间
// @Schemes
// @Tags 房间模块
// @Accept json
// @Produce json
// @Param request body map[string]interface{} true "params"
// @Success 200 {object} v1.Response
// @Router /room [post]
func (h *RoomHandler) AddRoom(ctx *gin.Context) {
	// TODO: 实现创建房间逻辑
	body := v1.RoomCreateRequest{}
	if err := ctx.ShouldBindJSON(&body); err != nil {
		v1.HandleError(ctx, 400, v1.ErrBadRequest, nil)
		return
	}
	room, err := h.roomService.CreateRoom(ctx, body)
	if err != nil {
		v1.HandleError(ctx, 500, err, nil)
		return
	}
	v1.HandleSuccess(ctx, room, "Room created successfully")
}

// GetRoom godoc
// @Summary 获取房间信息
// @Schemes
// @Tags 房间模块
// @Accept json
// @Produce json
// @Param id query string false "房间ID"
// @Success 200 {object} v1.Response
// @Router /room [get]
func (h *RoomHandler) GetRoom(ctx *gin.Context) {
	// TODO: 实现获取房间信息逻辑
	id := ctx.Query("id")
	userID := uint(GetUserIdFromCtx(ctx))
	memberPageSize := 0
	if pageSizeStr := ctx.Query("memberPageSize"); pageSizeStr != "" {
		if parsed, parseErr := strconv.Atoi(pageSizeStr); parseErr == nil && parsed > 0 {
			memberPageSize = parsed
		}
	}
	memberOffset := 0
	if startStr := ctx.Query("memberStart"); startStr != "" {
		if parsed, parseErr := strconv.Atoi(startStr); parseErr == nil && parsed >= 0 {
			memberOffset = parsed
		}
	}
	adminPageSize := 0
	if pageSizeStr := ctx.Query("adminPageSize"); pageSizeStr != "" {
		if parsed, parseErr := strconv.Atoi(pageSizeStr); parseErr == nil && parsed > 0 {
			adminPageSize = parsed
		}
	}
	adminOffset := 0
	if startStr := ctx.Query("adminStart"); startStr != "" {
		if parsed, parseErr := strconv.Atoi(startStr); parseErr == nil && parsed >= 0 {
			adminOffset = parsed
		}
	}
	var room interface{}
	var err error
	if id != "" {
		idUint64, parseErr := strconv.ParseUint(id, 10, 64)
		if parseErr != nil {
			v1.HandleError(ctx, 400, v1.ErrBadRequest, "invalid id")
			return
		}
		room, err = h.roomService.GetRoomByID(ctx, uint(idUint64), userID, memberPageSize, memberOffset, adminPageSize, adminOffset)
	} else {
		room, err = h.roomService.ListRooms(ctx)
	}
	if err != nil {
		v1.HandleError(ctx, 500, err, nil)
		return
	}
	v1.HandleSuccess(ctx, room)
}

// GetRoomMessages godoc
// @Summary 获取房间消息分页
// @Schemes
// @Tags 房间模块
// @Accept json
// @Produce json
// @Param id query string true "房间ID"
// @Param pageSize query string false "消息数量"
// @Param start query string false "消息偏移"
// @Success 200 {object} v1.Response
// @Router /room/messages [get]
func (h *RoomHandler) GetRoomMessages(ctx *gin.Context) {
	id := ctx.Query("id")
	if id == "" {
		v1.HandleError(ctx, 400, v1.ErrBadRequest, "missing id")
		return
	}
	roomID, err := strconv.ParseUint(id, 10, 64)
	if err != nil {
		v1.HandleError(ctx, 400, v1.ErrBadRequest, "invalid id")
		return
	}
	pageSize := 50
	if pageSizeStr := ctx.Query("pageSize"); pageSizeStr != "" {
		if parsed, parseErr := strconv.Atoi(pageSizeStr); parseErr == nil && parsed > 0 {
			pageSize = parsed
		}
	}
	offset := 0
	if startStr := ctx.Query("start"); startStr != "" {
		if parsed, parseErr := strconv.Atoi(startStr); parseErr == nil && parsed >= 0 {
			offset = parsed
		}
	}
	roomMessages, err := h.roomService.GetRoomMessages(ctx, uint(roomID), pageSize, offset)
	if err != nil {
		v1.HandleError(ctx, 500, err, nil)
		return
	}
	v1.HandleSuccess(ctx, roomMessages)
}

// GetRoomMembers godoc
// @Summary 获取房间用户分页
// @Schemes
// @Tags 房间模块
// @Accept json
// @Produce json
// @Param id query string true "房间ID"
// @Param role query string false "角色: member/admin"
// @Param pageSize query string false "用户数量"
// @Param start query string false "用户偏移"
// @Success 200 {object} v1.Response
// @Router /room/member [get]
func (h *RoomHandler) GetRoomMembers(ctx *gin.Context) {
	id := ctx.Query("id")
	if id == "" {
		v1.HandleError(ctx, 400, v1.ErrBadRequest, "missing id")
		return
	}
	roomID, err := strconv.ParseUint(id, 10, 64)
	if err != nil {
		v1.HandleError(ctx, 400, v1.ErrBadRequest, "invalid id")
		return
	}
	pageSize := 20
	if pageSizeStr := ctx.Query("pageSize"); pageSizeStr != "" {
		if parsed, parseErr := strconv.Atoi(pageSizeStr); parseErr == nil && parsed > 0 {
			pageSize = parsed
		}
	}
	offset := 0
	if startStr := ctx.Query("start"); startStr != "" {
		if parsed, parseErr := strconv.Atoi(startStr); parseErr == nil && parsed >= 0 {
			offset = parsed
		}
	}
	userID := uint(GetUserIdFromCtx(ctx))
	role := ctx.DefaultQuery("role", "member")
	members, err := h.roomService.GetRoomUsers(ctx, uint(roomID), userID, role, pageSize, offset)
	if err != nil {
		v1.HandleError(ctx, 500, err, nil)
		return
	}
	v1.HandleSuccess(ctx, members)
}

// UpdateRoom godoc
// @Summary 更新房间信息
// @Schemes
// @Tags 房间模块
// @Accept json
// @Produce json
// @Param request body map[string]interface{} true "params"
// @Success 200 {object} v1.Response
// @Router /room [patch]
func (h *RoomHandler) UpdateRoom(ctx *gin.Context) {
	// TODO: 实现更新房间逻辑
	req := v1.RoomUpdateRequest{}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		v1.HandleError(ctx, 400, v1.ErrBadRequest, nil)
		return
	}
	if req.GetID() == 0 {
		v1.HandleError(ctx, 400, v1.ErrBadRequest, "missing id")
		return
	}
	room, err := h.roomService.UpdateRoom(ctx, req)
	if err != nil {
		v1.HandleError(ctx, 500, err, nil)
		return
	}
	v1.HandleSuccess(ctx, room, "Room updated successfully")
}

// DeleteRoom godoc
// @Summary 删除房间
// @Schemes
// @Tags 房间模块
// @Accept json
// @Produce json
// @Param id query string true "房间ID"
// @Success 200 {object} v1.Response
// @Router /room [delete]
func (h *RoomHandler) DeleteRoom(ctx *gin.Context) {
	// TODO: 实现删除房间逻辑
	id := ctx.Query("id")
	if id == "" {
		v1.HandleError(ctx, 400, v1.ErrBadRequest, "missing id")
		return
	}
	idUint64, err := strconv.ParseUint(id, 10, 64)
	if err != nil {
		v1.HandleError(ctx, 400, v1.ErrBadRequest, "invalid id")
		return
	}
	err = h.roomService.DeleteRoom(ctx, uint(idUint64))
	if err != nil {
		v1.HandleError(ctx, 500, err, nil)
		return
	}
	v1.HandleSuccess(ctx, nil, "Room deleted successfully")
}

// JoinRoom godoc
// @Summary 加入房间
// @Schemes
// @Tags 房间模块
// @Accept json
// @Produce json
// @Param request body map[string]interface{} true "params"
// @Success 200 {object} v1.Response
// @Router /joinRoom [post]
func (h *RoomHandler) JoinRoom(ctx *gin.Context) {
	req := v1.JoinRoomRequest{}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		v1.HandleError(ctx, 400, v1.ErrBadRequest, nil)
		return
	}
	userID := GetUserIdFromCtx(ctx)
	if userID == 0 {
		v1.HandleError(ctx, 401, v1.ErrEmptyUserId, nil)
		return
	}
	room, err := h.roomService.JoinRoom(ctx, uint(userID), req.ID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			v1.HandleError(ctx, 404, v1.ErrNotFound, nil)
			return
		}
		v1.HandleError(ctx, 500, err, nil)
		return
	}
	v1.HandleSuccess(ctx, room, "Joined room successfully")
}

// GetMessage godoc
// @Summary 获取指定消息附近的消息窗口
// @Schemes
// @Tags 房间模块
// @Accept json
// @Produce json
// @Param id query string true "消息ID"
// @Param roomId query string true "房间ID"
// @Param pageSize query string false "消息数量"
// @Success 200 {object} v1.Response
// @Router /room/message [get]
func (h *RoomHandler) GetMessage(ctx *gin.Context) {
	messageID := ctx.Query("id")
	roomID := ctx.Query("roomId")
	if messageID == "" || roomID == "" {
		v1.HandleError(ctx, 400, v1.ErrBadRequest, "missing id or roomId")
		return
	}

	messageUint64, err := strconv.ParseUint(messageID, 10, 64)
	if err != nil {
		v1.HandleError(ctx, 400, v1.ErrBadRequest, "invalid id")
		return
	}
	roomUint64, err := strconv.ParseUint(roomID, 10, 64)
	if err != nil {
		v1.HandleError(ctx, 400, v1.ErrBadRequest, "invalid roomId")
		return
	}

	pageSize := 50
	if pageSizeStr := ctx.Query("pageSize"); pageSizeStr != "" {
		if parsed, parseErr := strconv.Atoi(pageSizeStr); parseErr == nil && parsed > 0 {
			pageSize = parsed
		}
	}

	messageWindow, err := h.roomService.GetRoomMessageWindow(ctx, uint(roomUint64), uint(messageUint64), pageSize)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			v1.HandleError(ctx, 404, v1.ErrNotFound, nil)
			return
		}
		v1.HandleError(ctx, 500, err, nil)
		return
	}
	v1.HandleSuccess(ctx, messageWindow)
}

// DeleteMessage godoc
// @Summary 删除房间消息
// @Schemes
// @Tags 房间模块
// @Accept json
// @Produce json
// @Param id query string true "消息ID"
// @Success 200 {object} v1.Response
// @Router /room/message [delete]
func (h *RoomHandler) DeleteMessage(ctx *gin.Context) {
	// TODO: 实现删除房间消息逻辑
	v1.HandleSuccess(ctx, map[string]interface{}{"msg": "not implemented"})
}

// Join room
func (h *RoomHandler) Join(ctx context.Context, msg []byte) (*v1.Response, error) {
	s := h.app.GetSessionFromCtx(ctx)
	fakeUID := s.ID()                              // just use s.ID as uid !!!
	err := s.Bind(ctx, strconv.Itoa(int(fakeUID))) // binding session uid

	if err != nil {
		return nil, pitaya.Error(err, "RH-000", map[string]string{"failed": "bind"})
	}

	// notify others
	h.app.GroupBroadcast(ctx, "chat", "test-room", "onNewUser", &v1.NewUser{Content: fmt.Sprintf("New user: %s", s.UID())})
	// new user join group
	h.app.GroupAddMember(ctx, "test-room", s.UID()) // add session to group
	uids, err := h.app.GroupMembers(ctx, "test-room")
	if err != nil {
		return nil, err
	}
	s.Push("onMembers", &v1.AllMembers{Members: uids})

	// on session close, remove it from group
	s.OnClose(func() {
		h.app.GroupRemoveMember(ctx, "test-room", s.UID())
	})

	return &v1.Response{
		Code:    0,
		Message: "success",
		Data:    "",
	}, nil
}

// Message sync last message to all members
func (h *RoomHandler) Message(ctx context.Context, msg *v1.UserMessage) {
	err := h.app.GroupBroadcast(ctx, "chat", "test-room", "onMessage", msg)
	if err != nil {
		fmt.Println("error broadcasting message", err)
	}
}
