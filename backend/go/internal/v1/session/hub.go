package session

import (
	"log/slog"
	"net/http"
	"sync"

	"Social-Media/backend/go/internal/v1/auth"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// TokenValidator defines the interface for a JWT validator.
type TokenValidator interface {
	ValidateToken(tokenString string) (*auth.CustomClaims, error)
}

// Hub manages all the active rooms and holds its dependencies.
type Hub struct {
	rooms     map[string]*Room
	mu        sync.Mutex
	validator TokenValidator
}

// NewHub creates a new Hub and configures it with its dependencies.
func NewHub(validator TokenValidator) *Hub {
	return &Hub{
		rooms:     make(map[string]*Room),
		validator: validator,
	}
}

// getOrCreateRoom creates a pointer to a room at the given id if it doesn't already exist.
func (h *Hub) getOrCreateRoom(id string) *Room {
	h.mu.Lock()
	defer h.mu.Unlock()

	if room, ok := h.rooms[id]; ok {
		return room
	}

	slog.Info("Creating new session room", "roomID", id)
	room := NewRoom(id)
	h.rooms[id] = room
	return room
}

// ServeWs authenticates the user and hands them off to the room.
func (h *Hub) ServeWs(c *gin.Context) {
	// --- AUTHENTICATION ---
	tokenString := c.Query("token") // from Auth0
	if tokenString == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "token not provided"})
		return
	}

	claims, err := h.validator.ValidateToken(tokenString)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}

	upgrader := &websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
            // Gin's CORS middleware already handles origin checks.
            return true
        },
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		slog.Error("Failed to upgrade connection", "error", err)
		return
	}

	// --- CLIENT & ROOM SETUP ---
	roomID := c.Param("roomId")
	room := h.getOrCreateRoom(roomID)

	client := &Client{
		conn:   conn,
		send:   make(chan []byte, 256),
		room:   room,
		UserID: claims.Subject,
		Role:   "participant",
	}

	// The room now handles the logic of what to do with the new client.
	room.handleClientJoined(client)

	// Start the client's goroutines.
	go client.writePump()
	go client.readPump()
}