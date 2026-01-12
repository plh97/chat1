package v1

import (
	"errors"
	"github.com/gin-gonic/gin"
	"net/http"
)

type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data"`
}

// HandleSuccess sends a success response with optional message
// Usage: HandleSuccess(ctx, data) or HandleSuccess(ctx, data, "Custom message")
func HandleSuccess(ctx *gin.Context, data interface{}, message ...string) {
	if data == nil {
		data = map[string]interface{}{}
	}
	msg := ""
	if len(message) > 0 && message[0] != "" {
		msg = message[0]
	}
	resp := Response{Code: 0, Message: msg, Data: data}
	ctx.JSON(http.StatusOK, resp)
}

func HandleError(ctx *gin.Context, httpCode int, err error, data interface{}) {
	if data == nil {
		data = map[string]string{}
	}
	code, ok := errorCodeMap[err]
	resp := Response{Code: code, Message: err.Error(), Data: data}
	if !ok {
		resp = Response{Code: 500, Message: err.Error(), Data: data}
	}
	ctx.JSON(httpCode, resp)
}

type Error struct {
	Code    int
	Message string
}

var errorCodeMap = map[error]int{}

func newError(code int, msg string) error {
	err := errors.New(msg)
	errorCodeMap[err] = code
	return err
}
func (e Error) Error() string {
	return e.Message
}
