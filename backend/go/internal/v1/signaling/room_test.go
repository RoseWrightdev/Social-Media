package signaling

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestAddAndRemoveClient(t *testing.T) {
	room := NewTestRoom("test-room")
	client := &Client{send: make(chan []byte, 1)}

	room.AddClient(client)
	room.mu.Lock()
	_, exists := room.clients[client]
	room.mu.Unlock()
	assert.True(t, exists, "Client should be added to the room")

	room.RemoveClient(client)
	room.mu.Lock()
	_, exists = room.clients[client]
	room.mu.Unlock()
	assert.False(t, exists, "Client should be removed from the room")
}

func TestBroadcastMessageToClients(t *testing.T) {
	room := NewTestRoom("broadcast-room")
	client1 := &Client{send: make(chan []byte, 1)}
	client2 := &Client{send: make(chan []byte, 1)}

	room.AddClient(client1)
	room.AddClient(client2)

	testMsg := []byte("hello world")
	room.Broadcast(testMsg)

	select {
	case msg := <-client1.send:
		assert.Equal(t, testMsg, msg)
	case <-time.After(time.Second):
		t.Error("Timeout waiting for message on client1")
	}

	select {
	case msg := <-client2.send:
		assert.Equal(t, testMsg, msg)
	case <-time.After(time.Second):
		t.Error("Timeout waiting for message on client2")
	}
}

func TestBroadcastRemovesUnresponsiveClient(t *testing.T) {
	room := NewTestRoom("unresponsive-room")
	client := &Client{send: make(chan []byte)} // unbuffered, will block

	room.AddClient(client)

	// Fill up the channel so the next send blocks
	go func() {
		room.Broadcast([]byte("first"))
	}()

	time.Sleep(50 * time.Millisecond) // Give goroutine time to block

	room.mu.Lock()
	_, exists := room.clients[client]
	room.mu.Unlock()
	assert.False(t, exists, "Unresponsive client should be removed from the room")
}

func TestRemoveClientClosesSendChannel(t *testing.T) {
	room := NewTestRoom("close-send")
	client := &Client{send: make(chan []byte, 1)}

	room.AddClient(client)
	room.RemoveClient(client)

	_, open := <-client.send
	assert.False(t, open, "Send channel should be closed after removing client")
}

func TestNewTestRoomInitializesFields(t *testing.T) {
	room := NewTestRoom("init-room")
	assert.Equal(t, "init-room", room.ID)
	assert.NotNil(t, room.clients)
	assert.NotNil(t, room.broadcast)
}
