package signaling

import (
	"errors"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/assert"
)

// MockConn is a mock implementation of our wsConnection interface.
type MockConn struct {
	// Messages to be "read" by the client
	ReadMessages chan []byte
	// Messages "written" by the client
	WrittenMessages chan []byte
	// Channel to signal that Close() has been called
	CloseCalled chan bool
	// An error to return on the next ReadMessage call
	ReadError error
	// An error to return on the next WriteMessage call
	WriteError error
}

// newMockConn creates a properly initialized MockConn for testing.
func newMockConn() *MockConn {
	return &MockConn{
		ReadMessages:    make(chan []byte, 5),
		WrittenMessages: make(chan []byte, 5),
		CloseCalled:     make(chan bool, 1),
	}
}

func (m *MockConn) ReadMessage() (int, []byte, error) {
	if m.ReadError != nil {
		return 0, nil, m.ReadError
	}
	msg, ok := <-m.ReadMessages
	if !ok {
		// Channel is closed, simulate a clean close error
		return 0, nil, &websocket.CloseError{Code: websocket.CloseNormalClosure}
	}
	return websocket.TextMessage, msg, nil
}

func (m *MockConn) WriteMessage(messageType int, data []byte) error {
	if m.WriteError != nil {
		return m.WriteError
	}
	m.WrittenMessages <- data
	return nil
}

func (m *MockConn) Close() error {
	m.CloseCalled <- true
	return nil
}

// --- Tests ---

func TestClient_readPump(t *testing.T) {
	t.Run("should broadcast messages and close on channel close", func(t *testing.T) {
		mockConn := newMockConn()
		room := NewTestRoom("test-room")
		client := &Client{conn: mockConn, room: room}

		// Start the pump in a goroutine
		go client.readPump()

		// Send messages to the mock connection to be "read"
		mockConn.ReadMessages <- []byte("hello")
		mockConn.ReadMessages <- []byte("world")

		// Assert that the messages are broadcast by the room
		assert.Equal(t, []byte("hello"), <-room.broadcast, "first message should be broadcast")
		assert.Equal(t, []byte("world"), <-room.broadcast, "second message should be broadcast")

		// Close the read channel to simulate the connection ending
		close(mockConn.ReadMessages)

		// Assert that the connection's Close() method was called
		select {
		case <-mockConn.CloseCalled:
			// Success
		case <-time.After(100 * time.Millisecond):
			t.Fatal("expected Close() to be called on connection")
		}
	})

	t.Run("should close on read error", func(t *testing.T) {
		mockConn := newMockConn()
		mockConn.ReadError = errors.New("a fatal read error")
		room := NewTestRoom("test-room")
		// We need to add the client to the room so RemoveClient can find it
		client := &Client{conn: mockConn, room: room}
		room.AddClient(client)

		// Run the pump directly since it will exit immediately
		client.readPump()

		// Assert that the connection's Close() method was called
		select {
		case <-mockConn.CloseCalled:
			// Success
		case <-time.After(100 * time.Millisecond):
			t.Fatal("expected Close() to be called on connection")
		}

		// Assert that the client was removed from the room
		// Note: This requires a way to check room state, a `ClientCount()` method is good for this.
		// For now, we trust the defer statement works.
	})
}

func TestClient_writePump(t *testing.T) {
	t.Run("should write messages from send channel and close", func(t *testing.T) {
		mockConn := newMockConn()
		client := &Client{
			conn: mockConn,
			send: make(chan []byte, 2),
		}

		go client.writePump()

		// Send messages to the client's send channel
		client.send <- []byte("foo")
		client.send <- []byte("bar")

		// Assert the messages were "written" to the mock connection
		assert.Equal(t, []byte("foo"), <-mockConn.WrittenMessages)
		assert.Equal(t, []byte("bar"), <-mockConn.WrittenMessages)

		// Close the send channel to end the pump
		close(client.send)

		// Assert that the connection's Close() method was called
		select {
		case <-mockConn.CloseCalled:
			// Success
		case <-time.After(100 * time.Millisecond):
			t.Fatal("expected Close() to be called on connection")
		}
	})

	t.Run("should close on write error", func(t *testing.T) {
		mockConn := newMockConn()
		mockConn.WriteError = errors.New("a fatal write error")
		client := &Client{
			conn: mockConn,
			send: make(chan []byte, 1),
		}

		// Run the pump directly. It will exit after the first write attempt.
		// We don't need a goroutine here.
		go client.writePump()

		client.send <- []byte("this will fail")

		// Assert that the connection's Close() method was called
		select {
		case <-mockConn.CloseCalled:
			// Success
		case <-time.After(100 * time.Millisecond):
			t.Fatal("expected Close() to be called on connection")
		}
	})
}
