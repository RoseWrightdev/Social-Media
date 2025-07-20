package session

import (
	"log/slog"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// Hub manages all the active rooms. It is exported so it can be used in main.go.
type Hub struct {
	rooms    map[string]*Room
	mu       sync.Mutex
	upgrader websocket.Upgrader
}

// NewHub creates a new Hub and configures it with the provided allowed origins.
func NewHub(allowedOrigins []string) *Hub {
	//closure that captures the allowedOrigins slice.
	checkOrigin := func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		for _, allowed := range allowedOrigins {
			if allowed == origin {
				// Log allowed connections for audit purposes.
				// In a real app, you might use a more structured logger.
				slog.Info("Origin allowed:", "origin", origin)
				return true
			}
		}
		slog.Error("Origin blocked:","origin", origin)
		return false
	}

	upgrader := websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin:     checkOrigin,
	}

	return &Hub{
		rooms:    make(map[string]*Room),
		upgrader: upgrader,
	}
}

// getOrCreateRoom is an unexported method to find an existing room or create a new one.
func (h *Hub) getOrCreateRoom(id string) *Room {
	h.mu.Lock()
	defer h.mu.Unlock()

	if room, ok := h.rooms[id]; ok {
		return room
	}

	room := &Room{
		ID:        id,
		clients:   make(map[*Client]bool),
		broadcast: make(chan []byte),
	}
	h.rooms[id] = room

	go room.run()

	return room
}

// ServeWs is an exported method that handles WebSocket requests from peers.
func (h *Hub) ServeWs(c *gin.Context) {
	roomID := c.Param("roomId")
	room := h.getOrCreateRoom(roomID)

	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		slog.Error("Failed to upgrade connection for room %s: %v", roomID, err)
		return
	}

	client := &Client{
		conn: conn,
		send: make(chan []byte, 256),
		room: room,
	}
	room.AddClient(client)

	slog.Info("Client connected to room %s. Total clients in room: %d", room.ID, len(room.clients))

	go client.writePump()
	go client.readPump()
}
