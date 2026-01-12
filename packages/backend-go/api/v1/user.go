package v1

import "backend-go/internal/model"

type RegisterRequest struct {
	Email string `json:"email" binding:"required,email" example:"1234@gmail.com"`
	// UserName string `json:"userName" binding:"required" example:"alan123"`
	Password string `json:"password" binding:"required" example:"123456"`
}

type LoginRequest struct {
	Email string `json:"email" binding:"required,email" example:"1234@gmail.com"`
	// UserName string `json:"userName" binding:"required" example:"alan123"`
	Password string `json:"password" binding:"required" example:"123456"`
}
type LoginResponseData struct {
	AccessToken string `json:"accessToken"`
}
type LoginResponse struct {
	Response
	Data LoginResponseData
}

type UpdateProfileRequest struct {
	UserName   *string `json:"userName" example:"alan"`
	Email      *string `json:"email" binding:"omitempty,email" example:"1234@gmail.com"`
	Bio        *string `json:"bio" example:"User's bio"`
	Github     *string `json:"github" example:"User's github"`
	QQ         *string `json:"qq" example:"User's QQ"`
	WeChat     *string `json:"wechat" example:"User's WeChat"`
	Permission *string `json:"permission" example:"User's permission"`
	Image      *string `json:"image" example:"User's avatar URL"`
}
type GetProfileResponseData struct {
	ID         uint         `json:"id"`
	UserName   string       `json:"userName" example:"alan"`
	Email      string       `json:"email" binding:"email" example:"1234@gmail.com"`
	Bio        string       `json:"bio" example:"User's bio"`
	Github     string       `json:"github" example:"User's github"`
	QQ         string       `json:"qq" example:"User's QQ"`
	WeChat     string       `json:"wechat" example:"User's WeChat"`
	Permission string       `json:"permission" example:"User's permission"`
	Image      string       `json:"image" example:"User's avatar URL"`
	Room       []model.Room `json:"room"`
}
type GetProfileResponse struct {
	Response
	Data GetProfileResponseData
}

type LogoutResponseData struct {
	Message string `json:"message"`
}
type LogoutResponse struct {
	Response
	Data LogoutResponseData
}

type AddFriendRequest struct {
	FriendID uint `json:"id" binding:"required" example:"2"`
}

type ListUsersRequest struct {
	ID       uint   `form:"id" json:"id"`
	UserName string `form:"userName" json:"userName"`
	Email    string `form:"email" json:"email"`
}

type DeleteFriendRequest struct {
	FriendID uint `json:"id" binding:"required" example:"2"`
}
