package signaling

import (
	"io"
	"log"

	"github.com/gorilla/websocket"
)


// wsConnection defines the methods we need from a websocket connection.
// This allows for easy mocking in tests.
type wsConnection interface {
	ReadMessage() (messageType int, p []byte, err error)
	WriteMessage(messageType int, data []byte) error
	Close() error
}

// Client represents a single connected user.
type Client struct {
	// The WebSocket connection, using our interface.
	conn wsConnection
	// Buffered channel of outbound messages.
	send chan []byte
	// The room this client is in.
	room *Room
}


// readPump pumps messages from the WebSocket connection to the room's broadcast channel.
func (c *Client) readPump() {
	defer func() {
		c.room.RemoveClient(c)
		c.conn.Close()
	}()

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			// Treat io.EOF and websocket.CloseNormalClosure as normal closure, don't log as error
			if err == io.EOF || websocket.IsCloseError(err, websocket.CloseNormalClosure) {
				break
			}
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}
		c.room.broadcast <- message
	}
}

// writePump pumps messages from the client's send channel to the WebSocket connection.
func (c *Client) writePump() {
	defer c.conn.Close()
	for message := range c.send {
		if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
			log.Printf("error writing message: %v", err)
			return
		}
	}
}

// NewTestClient is a helper for testing to create a client.
func NewTestClient() *Client {
	return &Client{
		send: make(chan []byte, 1),
	}
}
