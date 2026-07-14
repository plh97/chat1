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
	var room interface{}
	var err error
	if id != "" {
		idUint64, parseErr := strconv.ParseUint(id, 10, 64)
		if parseErr != nil {
			v1.HandleError(ctx, 400, v1.ErrBadRequest, "invalid id")
			return
		}
		room, err = h.roomService.GetRoomByID(ctx, uint(idUint64), pageSize, offset)
	} else {
		room, err = h.roomService.ListRooms(ctx)
	}
	if err != nil {
		v1.HandleError(ctx, 500, err, nil)
		return
	}
	v1.HandleSuccess(ctx, room)
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
	if req.ID == 0 {
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
