package handler

import (
	"context"
	"fmt"
	"strconv"
	"strings"
)

const (
	systemActionAddMember     = "ADD_MEMBER"
	systemActionRemoveMember  = "REMOVE_MEMBER"
	systemActionAddAdmin      = "ADD_ADMIN"
	systemActionRemoveAdmin   = "REMOVE_ADMIN"
	systemActionCreateRoom    = "CREATE_ROOM"
	systemActionAddFriend     = "ADD_FRIEND"
	systemActionChangeRoom    = "CHANGE_ROOM"
	systemActionTransferOwner = "TRANSFER_OWNER"
)

type RoomEventPublisher interface {
	NotifyRoomListChanged(userIDs []uint)
	PublishSystemMessage(ctx context.Context, roomID, actorUserID uint, actionType, content string) error
}

func systemMessageContent(actorID uint, action string, targetIDs ...uint) string {
	actor := strconv.FormatUint(uint64(actorID), 10)
	targets := make([]string, 0, len(targetIDs))
	for _, targetID := range targetIDs {
		if targetID != 0 {
			targets = append(targets, strconv.FormatUint(uint64(targetID), 10))
		}
	}
	targetList := strings.Join(targets, ", ")

	switch action {
	case systemActionCreateRoom:
		return fmt.Sprintf("%s created the room", actor)
	case systemActionAddFriend:
		return fmt.Sprintf("%s and %s are now friends", actor, targetList)
	case systemActionAddMember:
		if len(targetIDs) == 1 && targetIDs[0] == actorID {
			return fmt.Sprintf("%s joined the room", actor)
		}
		return fmt.Sprintf("%s added %s to the room", actor, targetList)
	case systemActionRemoveMember:
		return fmt.Sprintf("%s removed %s from the room", actor, targetList)
	case systemActionAddAdmin:
		return fmt.Sprintf("%s made %s a room administrator", actor, targetList)
	case systemActionRemoveAdmin:
		return fmt.Sprintf("%s removed %s as room administrator", actor, targetList)
	case systemActionTransferOwner:
		return fmt.Sprintf("%s transferred room ownership to %s", actor, targetList)
	case systemActionChangeRoom:
		return fmt.Sprintf("%s updated the room information", actor)
	default:
		return fmt.Sprintf("%s updated the room", actor)
	}
}

func roomNameChangeMessage(actorID uint, previousName, newName string) string {
	return fmt.Sprintf(
		`%d changed the room name from %q to %q`,
		actorID,
		previousName,
		newName,
	)
}

func roomImageChangeMessage(actorID uint) string {
	return fmt.Sprintf("%d changed the room avatar", actorID)
}

func uniqueRoomEventUserIDs(groups ...[]uint) []uint {
	seen := make(map[uint]struct{})
	userIDs := make([]uint, 0)
	for _, group := range groups {
		for _, userID := range group {
			if userID == 0 {
				continue
			}
			if _, exists := seen[userID]; exists {
				continue
			}
			seen[userID] = struct{}{}
			userIDs = append(userIDs, userID)
		}
	}
	return userIDs
}
