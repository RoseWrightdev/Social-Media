package session

import (
	"encoding/json"
	"log/slog"

	"github.com/gorilla/websocket"
)

// RoleType describes the type of client.
type RoleType string

const (
	RoleTypeWaiting     RoleType = "waiting"
	RoleTypeParticipant RoleType = "participant"
	RoleTypeScreenshare RoleType = "screenshare"
	RoleTypeHost        RoleType = "host"
)

// --- Role Interfaces (for type safety and clarity) ---
type Waiting interface {
	GetUserID() string
	GetRole() RoleType
	WaitingPrivileges()
}
type Participant interface {
	GetUserID() string
	GetRole() RoleType
}
type Screenshare interface {
	Participant
	ScreensharePrivileges()
}
type Host interface {
	Participant
	HostPrivileges()
}

// --- Concrete Client Types ---
type HostClient struct{ Client }

func (h *HostClient) HostPrivileges() {}

type ScreenshareClient struct{ Client }

func (s *ScreenshareClient) ScreensharePrivileges() {}

type WaitingClient struct{ Client }

func (w *WaitingClient) WaitingPrivileges() {}

// --- Connection and Room Interfaces ---

// wsConnection defines the methods we need from a websocket connection.
type wsConnection interface {
	ReadMessage() (messageType int, p []byte, err error)
	WriteMessage(messageType int, data []byte) error
	Close() error
}

// Roomer defines the methods a Client needs to interact with a Room.
// This allows us to use a real Room in production and a MockRoom in tests.
type Roomer interface {
	handleMessage(c *Client, msg Message)
	handleClientLeft(c *Client)
}

// Client represents a single connected user.
type Client struct {
	conn   wsConnection
	send   chan []byte
	room   Roomer
	UserID string
	Role   RoleType
}

// GetUserID returns the user ID associated with the client.
func (c *Client) GetUserID() string {
	return c.UserID
}

// GetRole returns the role type associated with the client.
func (c *Client) GetRole() RoleType {
	return c.Role
}

// readPump continuously reads messages from the client's WebSocket connection.
// It unmarshals incoming messages into the Message struct and passes them to the room's handleMessage method.
// If the connection is closed or an error occurs, it logs the event and ensures the client is removed from the room.
// Ran as a goroutine.
func (c *Client) readPump() {
	defer func() {
		c.room.handleClientLeft(c)
		c.conn.Close()
	}()

	for {
		_, rawMessage, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				slog.Warn("Unexpected client close", "userID", c.UserID, "error", err)
			}
			break
		}

		var msg Message
		if err := json.Unmarshal(rawMessage, &msg); err != nil {
			slog.Warn("Failed to unmarshal message", "userID", c.UserID, "error", err)
			continue
		}

		c.room.handleMessage(c, msg)
	}
}

// writePump continuously reads messages from the Client's send channel and writes them to the WebSocket connection.
// If an error occurs while writing a message, it logs the error and terminates the loop, closing the connection.
// This method is intended to be run as a goroutine to handle outgoing messages for the client.
func (c *Client) writePump() {
	defer c.conn.Close()
	for message := range c.send {
		if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
			slog.Error("error writing message", "error", err)
			return
		}
	}
}
