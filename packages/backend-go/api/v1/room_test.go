package v1

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestRoomUpdateRequestDistinguishesOmittedAndEmptyImage(t *testing.T) {
	var omitted RoomUpdateRequest
	require.NoError(t, json.Unmarshal([]byte(`{"id":"7"}`), &omitted))
	require.Nil(t, omitted.Image)

	var cleared RoomUpdateRequest
	require.NoError(t, json.Unmarshal([]byte(`{"id":"7","image":""}`), &cleared))
	require.NotNil(t, cleared.Image)
	require.Empty(t, *cleared.Image)
}

func TestRoomUpdateRequestAcceptsSingularAndPluralRemovalIDs(t *testing.T) {
	var singular RoomUpdateRequest
	require.NoError(t, json.Unmarshal([]byte(`{"id":7,"removeMemberId":["2"],"removeAdminId":[3]}`), &singular))
	require.Equal(t, []uint{2}, singular.GetRemoveMemberIDs())
	require.Equal(t, []uint{3}, singular.GetRemoveAdminIDs())

	var plural RoomUpdateRequest
	require.NoError(t, json.Unmarshal([]byte(`{"id":7,"removeMemberIds":["4"],"removeAdminIds":[5]}`), &plural))
	require.Equal(t, []uint{4}, plural.GetRemoveMemberIDs())
	require.Equal(t, []uint{5}, plural.GetRemoveAdminIDs())
}
