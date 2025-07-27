package session

// todo: write test suite
// todo: write file level comment

// import (
// 	"encoding/json"
// 	"errors"
// 	"sync"
// 	"testing"
// 	"time"

// 	"github.com/gorilla/websocket"
// 	"github.com/stretchr/testify/assert"
// )

// // MockConn is a mock implementation of our wsConnection interface.
// type MockConn struct {
// 	ReadMessages    chan []byte
// 	WrittenMessages chan []byte
// 	CloseCalled     chan bool
// 	ReadError       error
// 	WriteError      error
// }

// // newMockConn creates a properly initialized MockConn for testing.
// func newMockConn() *MockConn {
// 	return &MockConn{
// 		ReadMessages:    make(chan []byte, 5),
// 		WrittenMessages: make(chan []byte, 5),
// 		CloseCalled:     make(chan bool, 1),
// 	}
// }

// func (m *MockConn) ReadMessage() (int, []byte, error) {
// 	if m.ReadError != nil {
// 		return 0, nil, m.ReadError
// 	}
// 	msg, ok := <-m.ReadMessages
// 	if !ok {
// 		return 0, nil, &websocket.CloseError{Code: websocket.CloseNormalClosure}
// 	}
// 	return websocket.TextMessage, msg, nil
// }

// func (m *MockConn) WriteMessage(messageType int, data []byte) error {
// 	if m.WriteError != nil {
// 		return m.WriteError
// 	}
// 	m.WrittenMessages <- data
// 	return nil
// }

// func (m *MockConn) Close() error {
// 	select {
// 	case m.CloseCalled <- true:
// 	default:
// 	}
// 	return nil
// }

// // MockRoom is a mock implementation of a Room for testing the client.
// type MockRoom struct {
// 	mu               sync.Mutex
// 	handledMessage   chan Message
// 	clientLeftCalled chan *Client
// }

// func newMockRoom() *MockRoom {
// 	return &MockRoom{
// 		handledMessage:   make(chan Message, 5),
// 		clientLeftCalled: make(chan *Client, 1),
// 	}
// }

// func (m *MockRoom) handleMessage(c *Client, msg Message) {
// 	m.mu.Lock()
// 	defer m.mu.Unlock()
// 	m.handledMessage <- msg
// }

// func (m *MockRoom) handleClientLeft(c *Client) {
// 	m.mu.Lock()
// 	defer m.mu.Unlock()
// 	m.clientLeftCalled <- c
// }

// // --- Tests ---

// func TestClientGetters(t *testing.T) {
// 	client := &Client{UserID: "test-user", Role: RoleTypeHost}
// 	assert.Equal(t, "test-user", client.GetUserID())
// 	assert.Equal(t, RoleTypeHost, client.GetRole())
// }

// func TestClient_readPump(t *testing.T) {
// 	t.Run("should handle messages and pass to room", func(t *testing.T) {
// 		mockConn := newMockConn()
// 		mockRoom := newMockRoom()
// 		client := &Client{conn: mockConn, room: mockRoom, UserID: "test-user"}

// 		go client.readPump()

// 		// Send a valid message
// 		chatMsg := Message{Type: MessageTypeChat, Payload: ChatPayload{Content: "hello"}}
// 		msgBytes, _ := json.Marshal(chatMsg)
// 		mockConn.ReadMessages <- msgBytes

// 		// Verify the room's handleMessage was called
// 		select {
// 		case handled := <-mockRoom.handledMessage:
// 			assert.Equal(t, MessageTypeChat, handled.Type)
// 		case <-time.After(100 * time.Millisecond):
// 			t.Fatal("timed out waiting for room to handle message")
// 		}

// 		// Close the connection to stop the pump
// 		close(mockConn.ReadMessages)
// 	})

// 	t.Run("should continue on json unmarshal error", func(t *testing.T) {
// 		mockConn := newMockConn()
// 		mockRoom := newMockRoom()
// 		client := &Client{conn: mockConn, room: mockRoom}

// 		go client.readPump()

// 		// Send invalid JSON
// 		mockConn.ReadMessages <- []byte("{not_json}")

// 		// Send a valid message afterwards to ensure the loop didn't break
// 		chatMsg := Message{Type: MessageTypeChat}
// 		msgBytes, _ := json.Marshal(chatMsg)
// 		mockConn.ReadMessages <- msgBytes

// 		select {
// 		case <-mockRoom.handledMessage:
// 			// Success, the pump continued
// 		case <-time.After(100 * time.Millisecond):
// 			t.Fatal("readPump should have continued after unmarshal error")
// 		}
// 		close(mockConn.ReadMessages)
// 	})

// 	t.Run("should exit and clean up on read error", func(t *testing.T) {
// 		mockConn := newMockConn()
// 		mockConn.ReadError = errors.New("network error")
// 		mockRoom := newMockRoom()
// 		client := &Client{conn: mockConn, room: mockRoom}

// 		// Run the pump directly as it will exit immediately
// 		client.readPump()

// 		// Verify that handleClientLeft was called
// 		select {
// 		case leftClient := <-mockRoom.clientLeftCalled:
// 			assert.Equal(t, client, leftClient)
// 		case <-time.After(100 * time.Millisecond):
// 			t.Fatal("timed out waiting for handleClientLeft to be called")
// 		}

// 		// Verify that the connection was closed
// 		select {
// 		case <-mockConn.CloseCalled:
// 			// Success
// 		case <-time.After(100 * time.Millisecond):
// 			t.Fatal("timed out waiting for connection to be closed")
// 		}
// 	})
// }

// func TestClient_writePump(t *testing.T) {
// 	t.Run("should write messages from send channel", func(t *testing.T) {
// 		mockConn := newMockConn()
// 		client := &Client{
// 			conn: mockConn,
// 			send: make(chan []byte, 1),
// 		}

// 		go client.writePump()

// 		testMessage := []byte("hello from server")
// 		client.send <- testMessage

// 		select {
// 		case written := <-mockConn.WrittenMessages:
// 			assert.Equal(t, testMessage, written)
// 		case <-time.After(100 * time.Millisecond):
// 			t.Fatal("timed out waiting for message to be written")
// 		}
// 		close(client.send)
// 	})

// 	t.Run("should exit and close on write error", func(t *testing.T) {
// 		mockConn := newMockConn()
// 		mockConn.WriteError = errors.New("write error")
// 		client := &Client{
// 			conn: mockConn,
// 			send: make(chan []byte, 1),
// 		}

// 		go client.writePump()

// 		client.send <- []byte("this will fail")

// 		// Verify that the connection was closed
// 		select {
// 		case <-mockConn.CloseCalled:
// 			// Success
// 		case <-time.After(100 * time.Millisecond):
// 			t.Fatal("timed out waiting for connection to be closed on write error")
// 		}
// 	})
// }
