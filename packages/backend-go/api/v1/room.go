package v1

type (
	// UserMessage represents a message that user sent
	UserMessage struct {
		Name    string `json:"name"`
		Content string `json:"content"`
	}

	// RoomCreateRequest 用于创建房间的请求体
	RoomCreateRequest struct {
		Name      string `json:"name"`
		Image     string `json:"image"`
		CreatorID uint    `json:"creatorId"`
		AdminID   []uint  `json:"adminId"`
		AdminIDs  []uint  `json:"adminIds"`
		MemberID  []uint  `json:"memberId"`
		MemberIDs []uint  `json:"memberIds"`
	}

	// RoomUpdateRequest 用于更新房间的请求体
	RoomUpdateRequest struct {
		ID        uint   `json:"id"`
		Name      string `json:"name"`
		Image     string `json:"image"`
		CreatorID uint   `json:"creatorId"`
		AdminID   []uint `json:"adminId"`
		AdminIDs  []uint  `json:"adminIds"`
		MemberID  []uint `json:"memberId"`
		MemberIDs []uint  `json:"memberIds"`
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

func (r RoomCreateRequest) GetAdminIDs() []uint {
	if len(r.AdminIDs) > 0 {
		return r.AdminIDs
	}
	return r.AdminID
}

func (r RoomCreateRequest) GetMemberIDs() []uint {
	if len(r.MemberIDs) > 0 {
		return r.MemberIDs
	}
	return r.MemberID
}

func (r RoomUpdateRequest) GetAdminIDs() []uint {
	if len(r.AdminIDs) > 0 {
		return r.AdminIDs
	}
	return r.AdminID
}

func (r RoomUpdateRequest) GetMemberIDs() []uint {
	if len(r.MemberIDs) > 0 {
		return r.MemberIDs
	}
	return r.MemberID
}
