package v1

import (
	"encoding/json"
	"fmt"
	"strconv"
)

type RoomUserID uint

func (id *RoomUserID) UnmarshalJSON(data []byte) error {
	if len(data) == 0 || string(data) == "null" {
		*id = 0
		return nil
	}

	var numericValue uint
	if err := json.Unmarshal(data, &numericValue); err == nil {
		*id = RoomUserID(numericValue)
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
		*id = RoomUserID(parsed)
		return nil
	}

	return fmt.Errorf("invalid room user id: %s", string(data))
}

type (
	// UserMessage represents a message that user sent
	UserMessage struct {
		Name    string `json:"name"`
		Content string `json:"content"`
	}

	// RoomCreateRequest 用于创建房间的请求体
	RoomCreateRequest struct {
		Name      string       `json:"name"`
		Image     string       `json:"image"`
		CreatorID RoomUserID   `json:"creatorId"`
		AdminID   []RoomUserID `json:"adminId"`
		AdminIDs  []RoomUserID `json:"adminIds"`
		MemberID  []RoomUserID `json:"memberId"`
		MemberIDs []RoomUserID `json:"memberIds"`
	}

	// RoomUpdateRequest 用于更新房间的请求体
	RoomUpdateRequest struct {
		ID        RoomUserID   `json:"id"`
		Name      string       `json:"name"`
		Image     string       `json:"image"`
		CreatorID RoomUserID   `json:"creatorId"`
		AdminID   []RoomUserID `json:"adminId"`
		AdminIDs  []RoomUserID `json:"adminIds"`
		MemberID  []RoomUserID `json:"memberId"`
		MemberIDs []RoomUserID `json:"memberIds"`
	}

	// JoinRoomRequest 用于加入房间的请求体
	JoinRoomRequest struct {
		ID uint `json:"id"`
	}

	// NewUser message will be received when new user join room
	NewUser struct {
		Content string `json:"content"`
	}

	// AllMembers contains all members uid
	AllMembers struct {
		Members []string `json:"members"`
	}
)

func roomUserIDsToUint(ids []RoomUserID) []uint {
	converted := make([]uint, 0, len(ids))
	for _, id := range ids {
		converted = append(converted, uint(id))
	}
	return converted
}

func (r RoomCreateRequest) GetCreatorID() uint {
	return uint(r.CreatorID)
}

func (r RoomCreateRequest) GetAdminIDs() []uint {
	if len(r.AdminIDs) > 0 {
		return roomUserIDsToUint(r.AdminIDs)
	}
	return roomUserIDsToUint(r.AdminID)
}

func (r RoomCreateRequest) GetMemberIDs() []uint {
	if len(r.MemberIDs) > 0 {
		return roomUserIDsToUint(r.MemberIDs)
	}
	return roomUserIDsToUint(r.MemberID)
}

func (r RoomUpdateRequest) GetCreatorID() uint {
	return uint(r.CreatorID)
}

func (r RoomUpdateRequest) GetID() uint {
	return uint(r.ID)
}

func (r RoomUpdateRequest) GetAdminIDs() []uint {
	if len(r.AdminIDs) > 0 {
		return roomUserIDsToUint(r.AdminIDs)
	}
	return roomUserIDsToUint(r.AdminID)
}

func (r RoomUpdateRequest) GetMemberIDs() []uint {
	if len(r.MemberIDs) > 0 {
		return roomUserIDsToUint(r.MemberIDs)
	}
	return roomUserIDsToUint(r.MemberID)
}
