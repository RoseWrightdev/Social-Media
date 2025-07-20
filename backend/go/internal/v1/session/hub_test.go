package session
import (
	"net/http/httptest"
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)
func TestNewHub(t *testing.T) {
	hub := NewHub([]string{"localhost:3000"})
	require.NotNil(t, hub)
	assert.NotNil(t, hub.rooms)
	assert.Equal(t, 0, len(hub.rooms))
}


func TestGetOrCreateRoom(t *testing.T) {
	t.Run("should create room if there is no existing room", func (t *testing.T) {
		hub := NewHub([]string{"localhost:3000"})
		roomID := "room1"
		room := hub.getOrCreateRoom(roomID)
		require.NotNil(t, room)
		assert.Equal(t, roomID, room.ID)
		assert.Equal(t, 1, len(hub.rooms))
		assert.Equal(t, room, hub.rooms[roomID])

	})

	t.Run("should return existing room if there is an existing room", func (t *testing.T) {
		hub := NewHub([]string{"localhost:3000"})
		roomID := "room1"
		room1 := hub.getOrCreateRoom(roomID)
		room2 := hub.getOrCreateRoom(roomID)
		assert.Equal(t, room1, room2)
	})
}

func TestServeWs(t *testing.T) {
	t.Run("should return http.StatusBadRequest if there is a non-WebSocket request", func (t *testing.T) {
		gin.SetMode(gin.TestMode)
		hub := NewHub([]string{"localhost:3000"})
		router := gin.New()
		router.GET("/ws/:roomId", hub.ServeWs)

		// Simulate a non-WebSocket request (should fail to upgrade)
		req := httptest.NewRequest("GET", "/ws/testroom", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("", func (t *testing.T) {
		// This test only checks that ServeWs creates a room and adds a client.
		// Full WebSocket handshake is not performed in this unit test.
		gin.SetMode(gin.TestMode)
		hub := NewHub([]string{"localhost:3000"})
		router := gin.New()
		router.GET("/ws/:roomId", hub.ServeWs)

		// Simulate a non-WebSocket request (should fail to upgrade)
		req := httptest.NewRequest("GET", "/ws/room42", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// Room should be created even if upgrade fails
		room, ok := hub.rooms["room42"]
		assert.True(t, ok)
		assert.NotNil(t, room)
	})
}
