package ws

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"
	"strings"

	"backend-go/internal/model"
)

const (
	SystemActionAddMember     = "ADD_MEMBER"
	SystemActionRemoveMember  = "REMOVE_MEMBER"
	SystemActionAddAdmin      = "ADD_ADMIN"
	SystemActionRemoveAdmin   = "REMOVE_ADMIN"
	SystemActionCreateRoom    = "CREATE_ROOM"
	SystemActionRemoveRoom    = "REMOVE_ROOM"
	SystemActionAddFriend     = "ADD_FRIEND"
	SystemActionRemoveFriend  = "REMOVE_FRIEND"
	SystemActionChangeRoom    = "CHANGE_ROOM"
	SystemActionUpdateRoom    = "UPDATE_ROOM"
	SystemActionTransferOwner = "TRANSFER_OWNER"
)

var allowedSystemActions = map[string]struct{}{
	SystemActionAddMember:     {},
	SystemActionRemoveMember:  {},
	SystemActionAddAdmin:      {},
	SystemActionRemoveAdmin:   {},
	SystemActionCreateRoom:    {},
	SystemActionRemoveRoom:    {},
	SystemActionAddFriend:     {},
	SystemActionRemoveFriend:  {},
	SystemActionChangeRoom:    {},
	SystemActionUpdateRoom:    {},
	SystemActionTransferOwner: {},
}

type systemMessagePayload struct {
	ActionType string `json:"actionType"`
	Content    string `json:"content"`
}

// PublishSystemMessage persists a trusted room event and delivers it only to
// the room's current members. actorUserID must come from the authenticated HTTP
// context, never from a request body. The calling service/handler remains
// responsible for action-specific authorization (for example, creator/admin
// checks); this method independently enforces that the actor belongs to the
// room before writing or broadcasting anything.
func (h *Hub) PublishSystemMessage(
	ctx context.Context,
	roomID uint,
	actorUserID uint,
	actionType string,
	content string,
) error {
	if roomID == 0 || actorUserID == 0 {
		return errors.New("roomId and actorUserId are required")
	}
	if h.messageService == nil {
		return errors.New("message service is unavailable")
	}
	actionType = strings.TrimSpace(actionType)
	if _, allowed := allowedSystemActions[actionType]; !allowed {
		return errors.New("unsupported system message action")
	}
	if strings.TrimSpace(content) == "" {
		return errors.New("system message content is required")
	}

	recipients, err := h.roomRecipients(ctx, roomID, actorUserID)
	if err != nil {
		return err
	}

	actorID := strconv.Itoa(int(actorUserID))
	actor, err := h.lookupUser(ctx, actorID)
	if err != nil {
		return err
	}
	systemPayload, err := json.Marshal(systemMessagePayload{
		ActionType: actionType,
		Content:    content,
	})
	if err != nil {
		return err
	}
	channelID := strconv.Itoa(int(roomID))
	savedMessage, err := h.messageService.SendMessage(ctx, &model.Message{
		ContentType:   "SYSTEM_MESSAGE",
		ChannelId:     channelID,
		RoomId:        channelID,
		SystemMessage: string(systemPayload),
		UserId:        actorID,
	})
	if err != nil {
		return err
	}
	outgoing, err := h.formatOutgoingMessage(ctx, savedMessage, actor)
	if err != nil {
		return err
	}
	payload, err := json.Marshal(wsEnvelope{
		Event: wsSendMessageEvent,
		Code:  0,
		Data:  mustMarshalRawMessage(outgoing),
	})
	if err != nil {
		return err
	}

	h.targeted <- targetedMessage{userIDs: recipients, payload: payload}
	return nil
}
