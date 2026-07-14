package v1

import (
	"backend-go/internal/model"
	"encoding/json"
	"fmt"
	"strconv"
)

type FriendUserID uint

func (id *FriendUserID) UnmarshalJSON(data []byte) error {
	if len(data) == 0 || string(data) == "null" {
		*id = 0
		return nil
	}

	var numericValue uint
	if err := json.Unmarshal(data, &numericValue); err == nil {
		*id = FriendUserID(numericValue)
		return nil
	}

	var stringValue string
	if err := json.Unmarshal(data, &stringValue); err == nil {
		if stringValue == "" {
			*id = 0
			return nil
		}
		parsed, parseErr := strconv.ParseUint(stringValue, 10, 64)
		if parseErr != nil {
			return parseErr
		}
		*id = FriendUserID(parsed)
		return nil
	}

	return fmt.Errorf("invalid friend user id: %s", string(data))
}

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
	ID         string       `json:"id"`
	UserID     string       `json:"userId"`
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
	FriendID FriendUserID `json:"id" binding:"required" example:"2"`
}

func (r *AddFriendRequest) GetFriendID() uint {
	return uint(r.FriendID)
}

type ListUsersRequest struct {
	ID        uint   `form:"id" json:"id"`
	UserName  string `form:"userName" json:"userName"`
	Email     string `form:"email" json:"email"`
	ChannelID string `form:"channelId" json:"channelId"`
	Role      string `form:"role" json:"role"`
	PageSize  int    `form:"pageSize" json:"pageSize"`
	Start     int    `form:"start" json:"start"`
}

type DeleteFriendRequest struct {
	FriendID FriendUserID `json:"id" binding:"required" example:"2"`
}

func (r *DeleteFriendRequest) GetFriendID() uint {
	return uint(r.FriendID)
}
