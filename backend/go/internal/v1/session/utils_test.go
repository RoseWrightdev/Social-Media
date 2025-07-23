package session

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestGetAllowedOriginsFromEnv tests the GetAllowedOriginsFromEnv function to ensure it correctly
func TestGetAllowedOriginsFromEnv(t *testing.T) {
	t.Run("should return defaults if env is not set", func (t *testing.T) {
		allowedOrigins := GetAllowedOriginsFromEnv("null", []string{"localhost:3000"})
		assert.Equal(t, allowedOrigins, []string{"localhost:3000"})

	})
	
	t.Run("should return env if env is set at name envVarName", func (t *testing.T) {
		// mock env
		t.Setenv("ALLOWED_ORIGINS", "localhost:5050,localhost:1234")
		allowedOrigins := GetAllowedOriginsFromEnv("ALLOWED_ORIGINS", []string{"localhost:3000"})
		assert.Equal(t, allowedOrigins, []string{"localhost:5050", "localhost:1234"})
	})
}

// TestNewRoom verifies that a new Room instance is correctly initialized.
func TestNewRoom(t *testing.T) {
	roomID := "test-init-room"
	room := NewTestRoom(roomID, nil)

	require.NotNil(t, room, "NewRoom should not return nil")
	assert.Equal(t, roomID, room.ID, "Room ID should be set correctly")
	assert.NotNil(t, room.participants, "participants map should be initialized")
	assert.NotNil(t, room.waitingRoom, "waitingRoom map should be initialized")
	assert.NotNil(t, room.handsRaised, "handsRaised map should be initialized")
	assert.NotNil(t, room.hosts, "hosts map should be initialized")
	assert.NotNil(t, room.screenshares, "screenshares map should be initialized")
}