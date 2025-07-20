package session

import "sync"

// Room manages a set of clients for a specific signaling room.
type Room struct {
	ID        string
	clients   map[*Client]bool
	mu        sync.Mutex
	broadcast chan []byte
}

// run is an unexported method that starts the message broadcasting loop for the room.
func (r *Room) run() {
	for message := range r.broadcast {
		r.mu.Lock()
		for client := range r.clients {
			select {
			case client.send <- message:
			default:
				close(client.send)
				delete(r.clients, client)
			}
		}
		r.mu.Unlock()
	}
}

// AddClient adds a client to the room.
func (r *Room) AddClient(client *Client) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.clients[client] = true
}

// RemoveClient removes a client from the room.
func (r *Room) RemoveClient(client *Client) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.clients[client]; ok {
		delete(r.clients, client)
		// Add a check to prevent closing a nil channel
		if client.send != nil {
			close(client.send)
		}
	}
}


// NewTestRoom creates a new Room for testing purposes and starts its run loop.
func NewTestRoom(id string) *Room {
	room := &Room{
		ID:        id,
		clients:   make(map[*Client]bool),
		broadcast: make(chan []byte),
	}
	go room.run()
	return room
}

// Broadcast sends a message to the room's broadcast channel.
// This is a helper for testing. In the real app, this is triggered by a client's readPump.
func (r *Room) Broadcast(message []byte) {
	r.broadcast <- message
}
