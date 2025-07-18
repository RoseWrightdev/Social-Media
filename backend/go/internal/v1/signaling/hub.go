package signaling

import (
	"log"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// upgrader is an unexported variable that upgrades HTTP connections to WebSocket.
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// Note: In production, you should implement a proper origin check.
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// Hub manages all the active rooms. It is exported so it can be used in main.go.
type Hub struct {
	rooms map[string]*Room
	mu    sync.Mutex
}

// NewHub creates a new Hub. Exported for use in main.
func NewHub() *Hub {
	return &Hub{
		rooms: make(map[string]*Room),
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

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection for room %s: %v", roomID, err)
		return
	}

	client := &Client{
		conn: conn,
		send: make(chan []byte, 256),
		room: room,
	}
	room.AddClient(client)

	log.Printf("Client connected to room %s. Total clients in room: %d", room.ID, len(room.clients))

	go client.writePump()
	go client.readPump()
}
