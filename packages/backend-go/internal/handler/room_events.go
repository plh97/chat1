package handler

type RoomEventPublisher interface {
	NotifyRoomListChanged(userIDs []uint)
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
