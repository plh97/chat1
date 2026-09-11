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
	"strings"
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
	findImageFn    func(ctx context.Context, email string) (string, error)
	createFn       func(ctx context.Context, user *model.User) error
	updateFn       func(ctx context.Context, user *model.User) error
	updateFieldsFn func(ctx context.Context, id int, fields map[string]interface{}) error
	getByIDFn      func(ctx context.Context, id int) (*model.User, error)
	getProfileFn   func(ctx context.Context, id int) (*model.User, error)
	listFn         func(ctx context.Context, req v1.ListUsersRequest) ([]model.User, int64, error)
}

type stubFriendRepository struct {
	getFriendsFn func(ctx context.Context, userID uint) ([]*model.User, error)
}

var _ repository.UserRepository = (*stubUserRepository)(nil)
var _ repository.FriendRepository = (*stubFriendRepository)(nil)

func (s *stubFriendRepository) AddFriend(context.Context, uint, uint) (*model.Room, error) {
	return nil, nil
}

func (s *stubFriendRepository) DeleteFriend(context.Context, uint, uint) error {
	return nil
}

func (s *stubFriendRepository) GetFriends(ctx context.Context, userID uint) ([]*model.User, error) {
	if s.getFriendsFn != nil {
		return s.getFriendsFn(ctx, userID)
	}
	return nil, nil
}

func (s *stubFriendRepository) IsFriend(context.Context, uint, uint) (bool, error) {
	return false, nil
}

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

func (s *stubUserRepository) GetProfileByID(ctx context.Context, id int) (*model.User, error) {
	if s.getProfileFn != nil {
		return s.getProfileFn(ctx, id)
	}
	return s.GetByID(ctx, id)
}

func (s *stubUserRepository) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	if s.getByEmailFn != nil {
		return s.getByEmailFn(ctx, email)
	}
	return nil, nil
}

func (s *stubUserRepository) FindActiveLoginImage(ctx context.Context, email string) (string, error) {
	if s.findImageFn != nil {
		return s.findImageFn(ctx, email)
	}
	return "", nil
}

func (s *stubUserRepository) List(ctx context.Context, req v1.ListUsersRequest) ([]model.User, int64, error) {
	if s.listFn != nil {
		return s.listFn(ctx, req)
	}
	return nil, 0, nil
}

func newUserServiceForTest(tm repository.Transaction, userRepo repository.UserRepository) service.UserService {
	return newUserServiceWithFriendRepoForTest(tm, userRepo, nil)
}

func newUserServiceWithFriendRepoForTest(tm repository.Transaction, userRepo repository.UserRepository, friendRepo repository.FriendRepository) service.UserService {
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

func TestUserService_ListUsersReturnsPageMetadata(t *testing.T) {
	ctx := context.Background()
	req := v1.ListUsersRequest{UserName: "ali", PageSize: 6, Start: 6}
	userRepo := &stubUserRepository{
		listFn: func(ctx context.Context, actual v1.ListUsersRequest) ([]model.User, int64, error) {
			assert.Equal(t, req, actual)
			return []model.User{{UserName: "alice"}}, 13, nil
		},
	}
	userService := newUserServiceForTest(&stubTransaction{}, userRepo)

	result, err := userService.ListUsers(ctx, req)

	assert.NoError(t, err)
	assert.Equal(t, int64(13), result.TotalCount)
	assert.Len(t, result.Users, 1)
	assert.Equal(t, "alice", result.Users[0].UserName)
}

func TestUserService_ListUsersMarksFriendsAndCurrentUser(t *testing.T) {
	ctx := context.Background()
	req := v1.ListUsersRequest{UserName: "ali", CurrentUserID: 7}
	userRepo := &stubUserRepository{
		listFn: func(ctx context.Context, actual v1.ListUsersRequest) ([]model.User, int64, error) {
			assert.Equal(t, req, actual)
			return []model.User{
				{ID: 7, UserName: "current"},
				{ID: 8, UserName: "friend"},
				{ID: 9, UserName: "stranger"},
			}, 3, nil
		},
	}
	friendRepo := &stubFriendRepository{
		getFriendsFn: func(_ context.Context, userID uint) ([]*model.User, error) {
			assert.Equal(t, uint(7), userID)
			return []*model.User{{ID: 8}}, nil
		},
	}
	userService := newUserServiceWithFriendRepoForTest(&stubTransaction{}, userRepo, friendRepo)

	result, err := userService.ListUsers(ctx, req)

	assert.NoError(t, err)
	assert.True(t, result.Users[0].IsSelf)
	assert.False(t, result.Users[0].IsFriend)
	assert.False(t, result.Users[1].IsSelf)
	assert.True(t, result.Users[1].IsFriend)
	assert.False(t, result.Users[2].IsSelf)
	assert.False(t, result.Users[2].IsFriend)
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

func TestUserService_GetUserImageNormalizesLoginEmail(t *testing.T) {
	ctx := context.Background()
	userRepo := &stubUserRepository{
		findImageFn: func(ctx context.Context, email string) (string, error) {
			assert.Equal(t, "person@example.com", email)
			return "https://cdn.example.com/avatar.png", nil
		},
	}
	userService := newUserServiceForTest(&stubTransaction{}, userRepo)

	image, err := userService.GetUserImage(ctx, "  Person@Example.COM ")

	assert.NoError(t, err)
	assert.Equal(t, "https://cdn.example.com/avatar.png", image)
}

func TestUserService_GetUserImageSkipsUnusableIdentifiers(t *testing.T) {
	called := false
	userRepo := &stubUserRepository{
		findImageFn: func(ctx context.Context, email string) (string, error) {
			called = true
			return "unexpected", nil
		},
	}
	userService := newUserServiceForTest(&stubTransaction{}, userRepo)

	for _, email := range []string{"", "   ", strings.Repeat("a", 255)} {
		image, err := userService.GetUserImage(context.Background(), email)
		assert.NoError(t, err)
		assert.Empty(t, image)
	}
	assert.False(t, called)
}

func TestUserService_GetUserImagePreservesRepositoryErrorsForPrivateLogging(t *testing.T) {
	expected := errors.New("database unavailable")
	userRepo := &stubUserRepository{
		findImageFn: func(ctx context.Context, email string) (string, error) {
			return "", expected
		},
	}
	userService := newUserServiceForTest(&stubTransaction{}, userRepo)

	image, err := userService.GetUserImage(context.Background(), "person@example.com")

	assert.Empty(t, image)
	assert.ErrorIs(t, err, expected)
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
			assert.NotContains(t, fields, "permission")
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
