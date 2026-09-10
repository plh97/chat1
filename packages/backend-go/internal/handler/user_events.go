package handler

import "context"

// UserEventPublisher sends the public part of a saved profile to users who
// share a room with its owner. Email and other private fields never enter the
// WebSocket payload.
type UserEventPublisher interface {
	NotifyUserUpdated(ctx context.Context, userID uint, userName, image string)
}
