package service_test

import (
	v1 "backend-go/api/v1"
	"backend-go/internal/repository"
	"backend-go/pkg/aws"
	"backend-go/pkg/jwt"
	"context"
	"errors"
	"flag"
	"fmt"
	"os"
	"testing"

	"backend-go/internal/model"
	"backend-go/internal/service"
	"backend-go/pkg/config"
	"backend-go/pkg/log"
	"backend-go/pkg/sid"

	"github.com/stretchr/testify/assert"
	"golang.org/x/crypto/bcrypt"
)

var (
	logger *log.Logger
	j      *jwt.JWT
	sf     *sid.Sid
)

func TestMain(m *testing.M) {
	fmt.Println("begin")

	err := os.Setenv("APP_CONF", "../../../config/local.yml")
	if err != nil {
		panic(err)
	}

	var envConf = flag.String("conf", "config/local.yml", "config path, eg: -conf ./config/local.yml")
	flag.Parse()
	conf := config.NewConfig(*envConf)

	logger = log.NewLog(conf)
	j = jwt.NewJwt(conf)
	sf = sid.NewSid()

	code := m.Run()
	fmt.Println("test end")

	os.Exit(code)
}

type stubTransaction struct {
	called bool
	err    error
}

func (s *stubTransaction) Transaction(ctx context.Context, fn func(ctx context.Context) error) error {
	s.called = true
	if s.err != nil {
		return s.err
	}
	if fn == nil {
		return nil
	}
	return fn(ctx)
}

type stubUserRepository struct {
	getByEmailFn   func(ctx context.Context, email string) (*model.User, error)
	createFn       func(ctx context.Context, user *model.User) error
	updateFn       func(ctx context.Context, user *model.User) error
	updateFieldsFn func(ctx context.Context, id int, fields map[string]interface{}) error
	getByIDFn      func(ctx context.Context, id int) (*model.User, error)
	listFn         func(ctx context.Context, req v1.ListUsersRequest) ([]model.User, error)
}

var _ repository.UserRepository = (*stubUserRepository)(nil)

func (s *stubUserRepository) Create(ctx context.Context, user *model.User) error {
	if s.createFn != nil {
		return s.createFn(ctx, user)
	}
	return nil
}

func (s *stubUserRepository) Update(ctx context.Context, user *model.User) error {
	if s.updateFn != nil {
		return s.updateFn(ctx, user)
	}
	return nil
}

func (s *stubUserRepository) UpdateFields(ctx context.Context, id int, fields map[string]interface{}) error {
	if s.updateFieldsFn != nil {
		return s.updateFieldsFn(ctx, id, fields)
	}
	return nil
}

func (s *stubUserRepository) GetByID(ctx context.Context, id int) (*model.User, error) {
	if s.getByIDFn != nil {
		return s.getByIDFn(ctx, id)
	}
	return nil, nil
}

func (s *stubUserRepository) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	if s.getByEmailFn != nil {
		return s.getByEmailFn(ctx, email)
	}
	return nil, nil
}

func (s *stubUserRepository) List(ctx context.Context, req v1.ListUsersRequest) ([]model.User, error) {
	if s.listFn != nil {
		return s.listFn(ctx, req)
	}
	return nil, nil
}

func newUserServiceForTest(tm repository.Transaction, userRepo repository.UserRepository) service.UserService {
	var friendRepo repository.FriendRepository
	var r2Client *aws.CloudflareR2
	srv := service.NewService(tm, logger, sf, j)
	return service.NewUserService(srv, userRepo, friendRepo, r2Client)
}

func TestUserService_Register(t *testing.T) {
	ctx := context.Background()
	req := &v1.RegisterRequest{
		Password: "password",
		Email:    "test@example.com",
	}
	tm := &stubTransaction{}
	created := false
	userRepo := &stubUserRepository{
		getByEmailFn: func(ctx context.Context, email string) (*model.User, error) {
			assert.Equal(t, req.Email, email)
			return nil, nil
		},
		createFn: func(ctx context.Context, user *model.User) error {
			created = true
			assert.Equal(t, req.Email, user.Email)
			return nil
		},
	}
	userService := newUserServiceForTest(tm, userRepo)

	err := userService.Register(ctx, req)

	assert.NoError(t, err)
	assert.True(t, tm.called)
	assert.True(t, created)
}

func TestUserService_Register_UsernameExists(t *testing.T) {
	ctx := context.Background()
	req := &v1.RegisterRequest{
		Password: "password",
		Email:    "test@example.com",
	}
	tm := &stubTransaction{}
	userRepo := &stubUserRepository{
		getByEmailFn: func(ctx context.Context, email string) (*model.User, error) {
			return &model.User{ID: 1}, nil
		},
	}
	userService := newUserServiceForTest(tm, userRepo)

	err := userService.Register(ctx, req)

	assert.Error(t, err)
	assert.False(t, tm.called)
}

func TestUserService_Login(t *testing.T) {
	ctx := context.Background()
	req := &v1.LoginRequest{
		Email:    "xxx@gmail.com",
		Password: "password",
	}
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		t.Error("failed to hash password")
	}
	userRepo := &stubUserRepository{
		getByEmailFn: func(ctx context.Context, email string) (*model.User, error) {
			return &model.User{Password: string(hashedPassword)}, nil
		},
	}
	userService := newUserServiceForTest(&stubTransaction{}, userRepo)

	token, err := userService.Login(ctx, req)

	assert.NoError(t, err)
	assert.NotEmpty(t, token)
}

func TestUserService_Login_UserNotFound(t *testing.T) {
	ctx := context.Background()
	req := &v1.LoginRequest{
		Email:    "xxx@gmail.com",
		Password: "password",
	}
	userRepo := &stubUserRepository{
		getByEmailFn: func(ctx context.Context, email string) (*model.User, error) {
			return nil, errors.New("user not found")
		},
	}
	userService := newUserServiceForTest(&stubTransaction{}, userRepo)

	_, err := userService.Login(ctx, req)

	assert.Error(t, err)
}

func TestUserService_GetProfile(t *testing.T) {
	ctx := context.Background()
	userId := 123
	userRepo := &stubUserRepository{
		getByIDFn: func(ctx context.Context, id int) (*model.User, error) {
			assert.Equal(t, userId, id)
			return &model.User{
				ID:       uint(userId),
				UserName: "testuser",
				Email:    "test@example.com",
			}, nil
		},
	}
	userService := newUserServiceForTest(&stubTransaction{}, userRepo)

	user, err := userService.GetProfile(ctx, userId)

	assert.NoError(t, err)
	assert.Equal(t, "123", user.UserID)
	assert.Equal(t, "testuser", user.UserName)
}

func TestUserService_UpdateProfile(t *testing.T) {
	ctx := context.Background()
	userId := 123
	userName := "testuser"
	email := "test@example.com"
	req := &v1.UpdateProfileRequest{
		UserName: &userName,
		Email:    &email,
	}
	updated := false
	userRepo := &stubUserRepository{
		updateFieldsFn: func(ctx context.Context, id int, fields map[string]interface{}) error {
			updated = true
			assert.Equal(t, userId, id)
			assert.Equal(t, userName, fields["username"])
			assert.Equal(t, email, fields["email"])
			return nil
		},
		getByIDFn: func(ctx context.Context, id int) (*model.User, error) {
			return &model.User{
				ID:       uint(userId),
				UserName: userName,
				Email:    email,
			}, nil
		},
	}
	userService := newUserServiceForTest(&stubTransaction{}, userRepo)

	profile, err := userService.UpdateProfile(ctx, userId, req)

	assert.NoError(t, err)
	assert.True(t, updated)
	assert.Equal(t, email, profile.Email)
}

func TestUserService_UpdateProfile_UserNotFound(t *testing.T) {
	ctx := context.Background()
	userId := 123
	userName := "testuser"
	email := "test@example.com"
	req := &v1.UpdateProfileRequest{
		UserName: &userName,
		Email:    &email,
	}
	userRepo := &stubUserRepository{
		updateFieldsFn: func(ctx context.Context, id int, fields map[string]interface{}) error {
			return errors.New("user not found")
		},
	}
	userService := newUserServiceForTest(&stubTransaction{}, userRepo)

	_, err := userService.UpdateProfile(ctx, userId, req)

	assert.Error(t, err)
}
