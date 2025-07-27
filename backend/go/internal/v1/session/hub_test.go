package session

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"Social-Media/backend/go/internal/v1/auth"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// MockValidator is a mock implementation of the TokenValidator interface for testing.
type MockValidator struct {
	ClaimsToReturn *auth.CustomClaims
	ErrorToReturn  error
}

// ValidateToken is the mock implementation. It returns the pre-configured claims and error.
func (m *MockValidator) ValidateToken(tokenString string) (*auth.CustomClaims, error) {
	return m.ClaimsToReturn, m.ErrorToReturn
}

// NewTestHub creates a new Hub with a mock validator for testing purposes.
func NewTestHub(mockValidator TokenValidator) *Hub {
	if mockValidator == nil {
		// Provide a default mock if none is given
		mockValidator = &MockValidator{}
	}
	return NewHub(mockValidator)
}

func TestGetOrCreateRoom(t *testing.T) {
	hub := NewTestHub(nil) // Use the default mock validator
	var roomID RoomIDType = "test-room-1"

	// First call should create the room
	room1 := hub.getOrCreateRoom(roomID)
	require.NotNil(t, room1, "getOrCreateRoom should not return nil")
	assert.Equal(t, roomID, room1.ID, "Room ID should match the one provided")

	// Check internal state to be sure
	hub.mu.Lock()
	_, exists := hub.rooms[roomID]
	hub.mu.Unlock()
	assert.True(t, exists, "Room should exist in the hub's map after creation")

	// Second call should return the exact same room instance
	room2 := hub.getOrCreateRoom(roomID)
	assert.Same(t, room1, room2, "Subsequent calls with the same ID should return the same room instance")
}

func TestServeWs_AuthFailure(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("should fail if token is missing", func(t *testing.T) {
		hub := NewTestHub(nil)
		router := gin.New()
		router.GET("/ws/:roomId", hub.ServeWs)

		req := httptest.NewRequest("GET", "/ws/test-room", nil) // No token query param
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code, "Should return 401 Unauthorized if token is missing")
	})

	t.Run("should fail if token is invalid", func(t *testing.T) {
		// Configure the mock validator to return an error
		mockValidator := &MockValidator{
			ErrorToReturn: assert.AnError,
		}
		hub := NewTestHub(mockValidator)
		router := gin.New()
		router.GET("/ws/:roomId", hub.ServeWs)

		req := httptest.NewRequest("GET", "/ws/test-room?token=invalid-token", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code, "Should return 401 Unauthorized if token is invalid")
	})
}

func TestRemoveHub(t *testing.T) {
	hub := NewTestHub(nil)
	var testID RoomIDType = "test_room"
	hub.rooms[testID] = NewTestRoom(testID, nil)
	hub.removeRoom(testID)
	assert.Empty(t, hub.rooms)
	assert.Empty(t, hub.rooms[testID])
}
