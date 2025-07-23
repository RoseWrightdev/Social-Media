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

// removeRoom is a private method for the Hub to clean up empty rooms.
func (h *Hub) removeRoom(roomID string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Check if the room still exists and is empty before deleting.
	if room, ok := h.rooms[roomID]; ok && len(room.participants) == 0 {
		delete(h.rooms, roomID)
		slog.Info("Removed empty room from hub", "roomID", roomID)
	}
}

// getOrCreateRoom retrieves the Room associated with the given id from the Hub.
// If the Room does not exist, it creates a new Room, stores it in the Hub, and returns it.
// This method is safe for concurrent use.
func (h *Hub) getOrCreateRoom(id string) *Room {
	h.mu.Lock()
	defer h.mu.Unlock()

	if room, ok := h.rooms[id]; ok {
		return room
	}

	slog.Info("Creating new session room", "roomID", id)
	room := NewRoom(id, h.removeRoom)
	h.rooms[id] = room
	return room
}

// ServeWs authenticates the user and hands them off to the room.
// ServeWs upgrades an HTTP request to a WebSocket connection for real-time communication.
// It authenticates the user using a JWT token provided as a query parameter, validates the token,
// and establishes a WebSocket connection. Upon successful authentication and upgrade, it creates
// or retrieves a room based on the roomId path parameter, initializes a new client, and registers
// the client with the room. The client's read and write goroutines are started to handle message
// exchange over the WebSocket connection.
//
// Parameters:
//   - c: *gin.Context representing the HTTP request context.
//
// Responses:
//   - 401 Unauthorized if the token is missing or invalid.
//   - Upgrades to WebSocket on success.
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
			return true // Assuming Gin's CORS middleware handles this.
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

	// todo: **ACTION REQUIRED:** Add a custom claim for 'name' or 'nickname'
	// to Auth0 token via an Auth0 Action.
	displayName := claims.Subject // Fallback to subject if name is not in token
	if claims.Name != "" {
		displayName = claims.Name
	}

	client := &Client{
		conn:        conn,
		send:        make(chan []byte, 256),
		room:        room,
		UserID:      claims.Subject,
		DisplayName: displayName,
		Role:        RoleTypeHost, // Default role, should be derived from token scopes
	}

	room.handleClientJoined(client)

	// Start the client's goroutines.
	go client.writePump()
	go client.readPump()
}
