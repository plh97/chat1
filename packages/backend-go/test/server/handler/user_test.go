package handler

import (
	v1 "backend-go/api/v1"
	"backend-go/internal/handler"
	"backend-go/internal/middleware"
	"backend-go/internal/model"
	"backend-go/internal/service"
	jwt2 "backend-go/pkg/jwt"
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"time"

	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"backend-go/pkg/config"
	"backend-go/pkg/log"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

var (
	userId = 1
)
var logger *log.Logger
var hdl *handler.Handler
var jwt *jwt2.JWT

func TestMain(m *testing.M) {
	fmt.Println("begin")
	err := os.Setenv("APP_CONF", "../../../config/local.yml")
	if err != nil {
		fmt.Println("Setenv error", err)
	}
	var envConf = flag.String("conf", "config/local.yml", "config path, eg: -conf ./config/local.yml")
	flag.Parse()
	conf := config.NewConfig(*envConf)

	logger = log.NewLog(conf)
	hdl = handler.NewHandler(logger, nil)

	jwt = jwt2.NewJwt(conf)

	code := m.Run()
	fmt.Println("test end")

	os.Exit(code)
}

type stubUserService struct {
	registerFn           func(ctx context.Context, req *v1.RegisterRequest) error
	loginFn              func(ctx context.Context, req *v1.LoginRequest) (string, error)
	logoutFn             func(ctx context.Context) error
	getProfileFn         func(ctx context.Context, id int) (*v1.GetProfileResponseData, error)
	updateProfileFn      func(ctx context.Context, id int, req *v1.UpdateProfileRequest) (*v1.GetProfileResponseData, error)
	listUsersFn          func(ctx context.Context, req v1.ListUsersRequest) ([]model.User, error)
	addFriendFn          func(ctx context.Context, userId uint, req *v1.AddFriendRequest) (*model.Room, error)
	deleteFriendFn       func(ctx context.Context, userId uint, req *v1.DeleteFriendRequest) error
	uploadPresignedUrlFn func(fileExt string, scene int) (string, string, error)
}

var _ service.UserService = (*stubUserService)(nil)

func (s *stubUserService) Register(ctx context.Context, req *v1.RegisterRequest) error {
	if s.registerFn != nil {
		return s.registerFn(ctx, req)
	}
	return nil
}

func (s *stubUserService) Login(ctx context.Context, req *v1.LoginRequest) (string, error) {
	if s.loginFn != nil {
		return s.loginFn(ctx, req)
	}
	return "", nil
}

func (s *stubUserService) Logout(ctx context.Context) error {
	if s.logoutFn != nil {
		return s.logoutFn(ctx)
	}
	return nil
}

func (s *stubUserService) GetProfile(ctx context.Context, id int) (*v1.GetProfileResponseData, error) {
	if s.getProfileFn != nil {
		return s.getProfileFn(ctx, id)
	}
	return nil, nil
}

func (s *stubUserService) UpdateProfile(ctx context.Context, id int, req *v1.UpdateProfileRequest) (*v1.GetProfileResponseData, error) {
	if s.updateProfileFn != nil {
		return s.updateProfileFn(ctx, id, req)
	}
	return nil, nil
}

func (s *stubUserService) ListUsers(ctx context.Context, req v1.ListUsersRequest) ([]model.User, error) {
	if s.listUsersFn != nil {
		return s.listUsersFn(ctx, req)
	}
	return nil, nil
}

func (s *stubUserService) AddFriend(ctx context.Context, userId uint, req *v1.AddFriendRequest) (*model.Room, error) {
	if s.addFriendFn != nil {
		return s.addFriendFn(ctx, userId, req)
	}
	return nil, nil
}

func (s *stubUserService) DeleteFriend(ctx context.Context, userId uint, req *v1.DeleteFriendRequest) error {
	if s.deleteFriendFn != nil {
		return s.deleteFriendFn(ctx, userId, req)
	}
	return nil
}

func (s *stubUserService) UploadPresignedUrl(fileExt string, scene int) (string, string, error) {
	if s.uploadPresignedUrlFn != nil {
		return s.uploadPresignedUrlFn(fileExt, scene)
	}
	return "", "", nil
}

func newTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(
		middleware.CORSMiddleware(),
		middleware.ResponseLogMiddleware(logger),
		middleware.RequestLogMiddleware(logger),
	)
	return router
}

func TestUserHandler_Register(t *testing.T) {
	params := v1.RegisterRequest{
		Password: "123456",
		Email:    "xxx@gmail.com",
	}

	called := false
	userHandler := handler.NewUserHandler(hdl, &stubUserService{
		registerFn: func(ctx context.Context, req *v1.RegisterRequest) error {
			called = true
			assert.Equal(t, &params, req)
			return nil
		},
	})
	router := newTestRouter()
	router.POST("/register", userHandler.Register)

	paramsJson, _ := json.Marshal(params)

	resp := performRequest(router, "POST", "/register", bytes.NewBuffer(paramsJson))

	assert.Equal(t, resp.Code, http.StatusOK)
	assert.True(t, called)
}

func TestUserHandler_Login(t *testing.T) {
	params := v1.LoginRequest{
		Email:    "xxx@gmail.com",
		Password: "123456",
	}

	called := false
	userHandler := handler.NewUserHandler(hdl, &stubUserService{
		loginFn: func(ctx context.Context, req *v1.LoginRequest) (string, error) {
			called = true
			assert.Equal(t, &params, req)
			return "token", nil
		},
	})
	router := newTestRouter()
	router.POST("/login", userHandler.Login)
	paramsJson, _ := json.Marshal(params)

	resp := performRequest(router, "POST", "/login", bytes.NewBuffer(paramsJson))

	assert.Equal(t, resp.Code, http.StatusOK)
	assert.True(t, called)
}

func TestUserHandler_GetProfile(t *testing.T) {
	called := false
	userHandler := handler.NewUserHandler(hdl, &stubUserService{
		getProfileFn: func(ctx context.Context, id int) (*v1.GetProfileResponseData, error) {
			called = true
			assert.Equal(t, userId, id)
			return &v1.GetProfileResponseData{
				ID:       "1",
				UserID:   "1",
				UserName: "xxxxx",
			}, nil
		},
	})
	router := newTestRouter()
	router.Use(middleware.NoStrictAuth(jwt, logger))
	router.GET("/profile", userHandler.GetCurrentProfile)
	req, _ := http.NewRequest("GET", "/profile", nil)
	req.Header.Set("Authorization", "Bearer "+genToken(t))

	resp := httptest.NewRecorder()

	router.ServeHTTP(resp, req)
	assert.Equal(t, resp.Code, http.StatusOK)
	assert.True(t, called)
}

func TestUserHandler_UpdateProfile(t *testing.T) {
	userName := "alan"
	email := "alan@gmail.com"

	params := v1.UpdateProfileRequest{
		UserName: &userName,
		Email:    &email,
	}

	called := false
	userHandler := handler.NewUserHandler(hdl, &stubUserService{
		updateProfileFn: func(ctx context.Context, id int, req *v1.UpdateProfileRequest) (*v1.GetProfileResponseData, error) {
			called = true
			assert.Equal(t, userId, id)
			assert.Equal(t, &params, req)
			return &v1.GetProfileResponseData{
				ID:       "1",
				UserID:   "1",
				UserName: userName,
				Email:    email,
			}, nil
		},
	})
	router := newTestRouter()
	router.Use(middleware.StrictAuth(jwt, logger))
	router.PUT("/profile", userHandler.UpdateProfile)
	paramsJson, _ := json.Marshal(params)

	req, _ := http.NewRequest("PUT", "/profile", bytes.NewBuffer(paramsJson))
	req.Header.Set("Authorization", "Bearer "+genToken(t))
	req.Header.Set("Content-Type", "application/json")
	resp := httptest.NewRecorder()

	router.ServeHTTP(resp, req)

	assert.Equal(t, resp.Code, http.StatusOK)
	assert.True(t, called)
}

func performRequest(r http.Handler, method, path string, body *bytes.Buffer) *httptest.ResponseRecorder {
	req, _ := http.NewRequest(method, path, body)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)
	return resp
}
func genToken(t *testing.T) string {
	token, err := jwt.GenToken(userId, time.Now().Add(time.Hour*24*90))
	if err != nil {
		t.Error(err)
		return token
	}
	return token
}
