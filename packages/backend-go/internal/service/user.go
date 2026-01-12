package service

import (
	v1 "backend-go/api/v1"
	"backend-go/internal/model"
	"backend-go/internal/repository"
	"backend-go/pkg/aws"
	"context"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type UserService interface {
	Register(ctx context.Context, req *v1.RegisterRequest) error
	Login(ctx context.Context, req *v1.LoginRequest) (string, error)
	Logout(ctx context.Context) error
	GetProfile(ctx context.Context, id int) (*v1.GetProfileResponseData, error)
	UpdateProfile(ctx context.Context, id int, req *v1.UpdateProfileRequest) (*v1.GetProfileResponseData, error)
	ListUsers(ctx context.Context, req v1.ListUsersRequest) ([]model.User, error)
	AddFriend(ctx context.Context, userId uint, req *v1.AddFriendRequest) error
	DeleteFriend(ctx context.Context, userId uint, req *v1.DeleteFriendRequest) error
	UploadPresignedUrl(fileExt string, scene int) (string, string, error)
}

func NewUserService(service *Service, userRepo repository.UserRepository, friendRepo repository.FriendRepository, r2Client *aws.CloudflareR2) UserService {
	return &userService{
		userRepo:   userRepo,
		friendRepo: friendRepo,
		Service:    service,
		R2Client:   r2Client,
	}
}

type userService struct {
	userRepo   repository.UserRepository
	friendRepo repository.FriendRepository
	R2Client   *aws.CloudflareR2
	*Service
}

func (s *userService) UploadPresignedUrl(fileExt string, scene int) (string, string, error) {
	return s.R2Client.UploadPresignedUrl(fileExt, scene)
}

func (s *userService) Register(ctx context.Context, req *v1.RegisterRequest) error {
	// check username
	user, err := s.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		return v1.ErrInternalServerError
	}
	if err == nil && user != nil {
		return v1.ErrEmailAlreadyUse
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	if err != nil {
		return err
	}
	user = &model.User{
		Email:    req.Email,
		Password: string(hashedPassword),
	}
	// Transaction demo
	err = s.tm.Transaction(ctx, func(ctx context.Context) error {
		// Create a user
		if err = s.userRepo.Create(ctx, user); err != nil {
			return err
		}
		// TODO: other repo
		return nil
	})
	return err
}

func (s *userService) Login(ctx context.Context, req *v1.LoginRequest) (string, error) {
	user, err := s.userRepo.GetByEmail(ctx, req.Email)
	if err != nil || user == nil {
		return "", v1.ErrInvalidCredentials
	}
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
	if err != nil {
		return "", v1.ErrInvalidCredentials
	}
	token, err := s.jwt.GenToken(int(user.ID), time.Now().Add(time.Hour*24*90))
	if err != nil {
		return "", err
	}

	return token, nil
}

func (s *userService) Logout(ctx context.Context) error {
	// JWT是无状态的，logout操作只需返回成功
	// 客户端负责删除本地存储的token
	return nil
}

func (s *userService) GetProfile(ctx context.Context, id int) (*v1.GetProfileResponseData, error) {
	user, err := s.userRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return &v1.GetProfileResponseData{
		ID:         user.ID,
		UserName:   user.UserName,
		Email:      user.Email,
		Bio:        user.Bio,
		Github:     user.Github,
		QQ:         user.QQ,
		WeChat:     user.WeChat,
		Permission: user.Permission,
		Image:      user.Image,
		Room:       user.Rooms,
	}, nil
}

func (s *userService) UpdateProfile(ctx context.Context, id int, req *v1.UpdateProfileRequest) (*v1.GetProfileResponseData, error) {
	// Build update map with only provided fields
	updates := make(map[string]interface{})

	if req.UserName != nil {
		updates["username"] = *req.UserName
	}
	if req.Email != nil {
		updates["email"] = *req.Email
	}
	if req.Bio != nil {
		updates["bio"] = *req.Bio
	}
	if req.Github != nil {
		updates["github"] = *req.Github
	}
	if req.QQ != nil {
		updates["qq"] = *req.QQ
	}
	if req.WeChat != nil {
		updates["wechat"] = *req.WeChat
	}
	if req.Permission != nil {
		updates["permission"] = *req.Permission
	}
	if req.Image != nil {
		updates["image"] = *req.Image
	}

	// No fields to update
	if len(updates) == 0 {
		return nil, v1.ErrBadRequestParamsNotEnough
	}

	if err := s.userRepo.UpdateFields(ctx, id, updates); err != nil {
		return nil, err
	}

	// Fetch and return updated user profile
	user, err := s.userRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return &v1.GetProfileResponseData{
		ID:         user.ID,
		UserName:   user.UserName,
		Email:      user.Email,
		Bio:        user.Bio,
		Github:     user.Github,
		QQ:         user.QQ,
		WeChat:     user.WeChat,
		Permission: user.Permission,
		Image:      user.Image,
		Room:       user.Rooms,
	}, nil
}

func (s *userService) ListUsers(ctx context.Context, req v1.ListUsersRequest) ([]model.User, error) {
	users, err := s.userRepo.List(ctx, req)
	if err != nil {
		return nil, err
	}
	return users, nil
}

func (s *userService) AddFriend(ctx context.Context, userId uint, req *v1.AddFriendRequest) error {
	// Validate that user is not adding themselves
	if userId == req.FriendID {
		return v1.ErrBadRequest
	}

	// Check if friend user exists
	_, err := s.userRepo.GetByID(ctx, int(req.FriendID))
	if err != nil {
		return err
	}

	// Add friend
	if err := s.friendRepo.AddFriend(ctx, userId, req.FriendID); err != nil {
		return err
	}

	return nil
}

func (s *userService) DeleteFriend(ctx context.Context, userId uint, req *v1.DeleteFriendRequest) error {
	// Delete friend
	if err := s.friendRepo.DeleteFriend(ctx, userId, req.FriendID); err != nil {
		return err
	}

	return nil
}
