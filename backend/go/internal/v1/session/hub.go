package session

import (
	"log/slog"
	"net/http"
	"net/url"
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
	rooms     map[RoomIdType]*Room
	mu        sync.Mutex
	validator TokenValidator
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

	allowedOrigins := GetAllowedOriginsFromEnv("ALLOWED_ORIGINS", []string{"http://localhost:3000"})
	upgrader := websocket.Upgrader{
		// This is the secure way to check the origin.
		CheckOrigin: func(r *http.Request) bool {
			origin := r.Header.Get("Origin")
			if origin == "" {
				return true // Allow non-browser clients (e.g., for testing)
			}
			originURL, err := url.Parse(origin)
			if err != nil {
				return false
			}

			for _, allowed := range allowedOrigins {
				allowedURL, err := url.Parse(allowed)
				if err != nil {
					continue
				}
				// Check if the scheme and host match.
				if originURL.Scheme == allowedURL.Scheme && originURL.Host == allowedURL.Host {
					return true
				}
			}
			return false
		},
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		slog.Error("Failed to upgrade connection", "error", err)
		return
	}

	// --- CLIENT & ROOM SETUP ---
	roomId := c.Param("roomId")
	room := h.getOrCreateRoom(RoomIdType(roomId))

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
		ID:    ClientIdType(claims.Subject),
		DisplayName: DisplayNameType(displayName),
		Role:        RoleTypeHost, // Default role, should be derived from token scopes
	}

	room.handleClientConnect(client)

	// Start the client's goroutines.
	go client.writePump()
	go client.readPump()
}

// NewHub creates a new Hub and configures it with its dependencies.
func NewHub(validator TokenValidator) *Hub {
	return &Hub{
		rooms:     make(map[RoomIdType]*Room),
		validator: validator,
	}
}

// removeRoom is a private method for the Hub to clean up empty rooms.
func (h *Hub) removeRoom(roomId RoomIdType) {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Check if the room still exists and is empty before deleting.
	if room, ok := h.rooms[roomId]; ok && len(room.participants) == 0 {
		delete(h.rooms, roomId)
		slog.Info("Removed empty room from hub", "roomId", roomId)
	}
}

// getOrCreateRoom retrieves the Room associated with the given RoomId from the Hub.
// If the Room does not exist, it creates a new Room, stores it in the Hub, and returns it.
// This method is safe for concurrent use.
func (h *Hub) getOrCreateRoom(roomId RoomIdType) *Room {
	h.mu.Lock()
	defer h.mu.Unlock()

	if room, ok := h.rooms[roomId]; ok {
		return room
	}

	slog.Info("Creating new session room", "roomroomId", roomId)
	room := NewRoom(roomId, h.removeRoom)
	h.rooms[roomId] = room
	return room
}
