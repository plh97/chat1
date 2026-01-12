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
		CreatorID uint    `json:"creatorId"`
		AdminIDs  []uint  `json:"adminIds"`
		MemberIDs []uint  `json:"memberIds"`
	}

	// RoomUpdateRequest 用于更新房间的请求体
	RoomUpdateRequest struct {
		ID        uint   `json:"id"`
		Name      string `json:"name"`
		CreatorID uint    `json:"creatorId"`
		AdminIDs  []uint  `json:"adminIds"`
		MemberIDs []uint  `json:"memberIds"`
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
