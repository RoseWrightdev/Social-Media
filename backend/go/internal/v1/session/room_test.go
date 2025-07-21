package session

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// newTestClient creates a client for testing purposes.
func newTestClient(userID string) *Client {
	return &Client{
		UserID: userID,
		send:   make(chan []byte, 10), // Buffered channel to avoid blocking in tests
	}
}

func TestNewRoom(t *testing.T) {
	roomID := "test-init-room"
	room := NewRoom(roomID)

	require.NotNil(t, room, "NewRoom should not return nil")
	assert.Equal(t, roomID, room.ID, "Room ID should be set correctly")
	assert.NotNil(t, room.participants, "participants map should be initialized")
	assert.NotNil(t, room.waitingRoom, "waitingRoom map should be initialized")
	assert.NotNil(t, room.handsRaised, "handsRaised map should be initialized")
	assert.NotNil(t, room.hosts, "hosts map should be initialized")
	assert.NotNil(t, room.screenshares, "screenshares map should be initialized")
}

func TestHandleClientJoined(t *testing.T) {
	t.Run("first client becomes host and is admitted", func(t *testing.T) {
		room := NewTestRoom("test-host-room")
		client1 := newTestClient("user-host")

		room.handleClientJoined(client1)

		room.mu.RLock()
		assert.True(t, room.hosts[client1], "First client should be a host")
		assert.True(t, room.participants[client1], "First client should be a participant")
		assert.Empty(t, room.waitingRoom, "Waiting room should be empty")
		room.mu.RUnlock()

		// Check for RoomState broadcast
		select {
		case msgBytes := <-client1.send:
			var msg Message
			err := json.Unmarshal(msgBytes, &msg)
			require.NoError(t, err)
			assert.Equal(t, EventTypeRoomState, msg.Type)
		case <-time.After(100 * time.Millisecond):
			t.Fatal("timed out waiting for room state message")
		}
	})

	t.Run("subsequent client enters waiting room", func(t *testing.T) {
		room := NewTestRoom("test-wait-room")
		hostClient := newTestClient("user-host")
		waitingClient := newTestClient("user-waiting")

		// First client becomes host
		room.handleClientJoined(hostClient)
		<-hostClient.send // clear the initial broadcast

		// Second client joins
		room.handleClientJoined(waitingClient)

		room.mu.RLock()
		assert.False(t, room.participants[waitingClient], "Second client should not be a participant yet")
		assert.True(t, room.waitingRoom[waitingClient], "Second client should be in the waiting room")
		assert.Equal(t, RoleTypeWaiting, waitingClient.Role, "Waiting client's role should be set to waiting")
		room.mu.RUnlock()
	})
}

func TestHandleClientLeft(t *testing.T) {
	room := NewTestRoom("test-leave-room")
	hostClient := newTestClient("user-host")
	participantClient := newTestClient("user-participant")

	room.handleClientJoined(hostClient)
	// Manually admit the second client for the test
	room.mu.Lock()
	room.admitClient_unlocked(participantClient)
	room.mu.Unlock()

	// Clear send channels
	<-hostClient.send
	<-participantClient.send

	// Participant leaves
	room.handleClientLeft(participantClient)

	room.mu.RLock()
	assert.NotContains(t, room.participants, participantClient, "Client should be removed from participants")
	room.mu.RUnlock()

	// Host should receive a state update
	select {
	case msgBytes := <-hostClient.send:
		var msg Message
		err := json.Unmarshal(msgBytes, &msg)
		require.NoError(t, err)
		assert.Equal(t, EventTypeRoomState, msg.Type)
	case <-time.After(100 * time.Millisecond):
		t.Fatal("timed out waiting for room state update after user left")
	}
}

func TestHandleMessage_ChatMessage(t *testing.T) {
	room := NewTestRoom("test-chat-room")
	client1 := newTestClient("user1")
	client2 := newTestClient("user2")

	room.handleClientJoined(client1) // Becomes host
	room.mu.Lock()
	room.admitClient_unlocked(client2)
	room.mu.Unlock()

	// Clear initial state messages
	<-client1.send
	<-client1.send // Clear client1's message from client2's join
	<-client2.send

	chatPayload := ChatPayload{SenderID: "user1", Content: "Hello World"}
	msg := Message{
		Type:    MessageTypeChat,
		Payload: chatPayload,
	}

	room.handleMessage(client1, msg)

	// Both clients should receive the chat message
	for _, c := range []*Client{client1, client2} {
		select {
		case msgBytes := <-c.send:
			var receivedMsg Message
			err := json.Unmarshal(msgBytes, &receivedMsg)
			require.NoError(t, err)
			assert.Equal(t, MessageTypeChat, receivedMsg.Type)

			var receivedPayload ChatPayload
			err = UnmarshalPayload(receivedMsg.Payload, &receivedPayload)
			require.NoError(t, err)
			assert.Equal(t, "Hello World", receivedPayload.Content)
			assert.Equal(t, client1.UserID, receivedPayload.SenderID)
		case <-time.After(100 * time.Millisecond):
			t.Fatalf("timed out waiting for chat message for client %s", c.UserID)
		}
	}
}

func TestHandleMessage_RaiseHand(t *testing.T) {
	room := NewTestRoom("test-raise-hand")
	client := newTestClient("user1")
	room.handleClientJoined(client) // Becomes host
	<-client.send                  // Clear initial state

	// Raise hand
	raiseHandPayload := RaiseHandPayload{IsRaised: true}
	msg := Message{Type: MessageTypeRaiseHand, Payload: raiseHandPayload}
	room.handleMessage(client, msg)

	room.mu.RLock()
	assert.True(t, room.handsRaised[client], "Client should be in handsRaised map")
	room.mu.RUnlock()

	// Check for state broadcast
	select {
	case msgBytes := <-client.send:
		var receivedMsg Message
		err := json.Unmarshal(msgBytes, &receivedMsg)
		require.NoError(t, err)
		assert.Equal(t, EventTypeRoomState, receivedMsg.Type)

		var p RoomStatePayload
		err = UnmarshalPayload(receivedMsg.Payload, &p)
		require.NoError(t, err)
		assert.Contains(t, p.HandsRaised, client.UserID, "Broadcasted state should show hand as raised")
	case <-time.After(100 * time.Millisecond):
		t.Fatal("timed out waiting for room state update after raising hand")
	}
}

func TestHandleMessage_AdmitUser(t *testing.T) {
	room := NewTestRoom("test-admit-room")
	host := newTestClient("host1")
	waitingUser := newTestClient("waiter1")
	room.handleClientJoined(host)
	room.handleClientJoined(waitingUser)

	// Clear initial messages
	<-host.send
	<-host.send

	admitPayload := AdmitUserPayload{TargetUserID: "waiter1"}
	msg := Message{Type: MessageTypeAdmitUser, Payload: admitPayload}

	// Non-host cannot admit
	nonHost := newTestClient("non-host")
	nonHost.Role = RoleTypeParticipant
	room.handleMessage(nonHost, msg)
	room.mu.RLock()
	assert.True(t, room.waitingRoom[waitingUser], "User should still be in waiting room after non-host attempt")
	room.mu.RUnlock()

	// Host can admit
	room.handleMessage(host, msg)
	room.mu.RLock()
	assert.False(t, room.waitingRoom[waitingUser], "User should no longer be in waiting room")
	assert.True(t, room.participants[waitingUser], "User should now be a participant")
	assert.Equal(t, RoleTypeParticipant, waitingUser.Role)
	room.mu.RUnlock()
}
func TestBroadcastToParticipantsUnlocked(t *testing.T) {
	room := NewTestRoom("test-broadcast-room")
	client1 := newTestClient("user1")
	client2 := newTestClient("user2")
	client3 := newTestClient("user3")

	// Add clients as participants
	room.mu.Lock()
	room.participants[client1] = true
	room.participants[client2] = true
	room.participants[client3] = true
	room.mu.Unlock()

	payload := ChatPayload{SenderID: "user1", Content: "Broadcast message"}
	room.mu.RLock()
	room.broadcastToParticipants_unlocked(MessageTypeChat, payload)
	room.mu.RUnlock()

	for _, c := range []*Client{client1, client2, client3} {
		select {
		case msgBytes := <-c.send:
			var msg Message
			err := json.Unmarshal(msgBytes, &msg)
			require.NoError(t, err)
			assert.Equal(t, MessageTypeChat, msg.Type)
			var cp ChatPayload
			err = UnmarshalPayload(msg.Payload, &cp)
			require.NoError(t, err)
			assert.Equal(t, "Broadcast message", cp.Content)
		case <-time.After(100 * time.Millisecond):
			t.Fatalf("timed out waiting for broadcast message for client %s", c.UserID)
		}
	}
}

func TestBroadcastRoomStateUnlocked(t *testing.T) {
	room := NewTestRoom("test-roomstate-room")
	client1 := newTestClient("user1")
	client2 := newTestClient("user2")

	room.mu.Lock()
	room.participants[client1] = true
	room.participants[client2] = true
	room.handsRaised[client2] = true
	room.mu.Unlock()

	room.mu.RLock()
	room.broadcastRoomState_unlocked()
	room.mu.RUnlock()

	for _, c := range []*Client{client1, client2} {
		select {
		case msgBytes := <-c.send:
			var msg Message
			err := json.Unmarshal(msgBytes, &msg)
			require.NoError(t, err)
			assert.Equal(t, EventTypeRoomState, msg.Type)
			var rsp RoomStatePayload
			err = UnmarshalPayload(msg.Payload, &rsp)
			require.NoError(t, err)
			assert.Equal(t, room.ID, rsp.RoomID)
			assert.Contains(t, rsp.Participants, client1.UserID)
			assert.Contains(t, rsp.Participants, client2.UserID)
			assert.Contains(t, rsp.HandsRaised, client2.UserID)
		case <-time.After(100 * time.Millisecond):
			t.Fatalf("timed out waiting for room state for client %s", c.UserID)
		}
	}
}

func TestBroadcastToParticipantsUnlocked_MarshalError(t *testing.T) {
	room := NewTestRoom("test-marshal-error")
	client := newTestClient("user1")
	room.mu.Lock()
	room.participants[client] = true
	room.mu.Unlock()

	// Create a payload that cannot be marshaled (channel type)
	payload := make(chan int)
	room.mu.RLock()
	room.broadcastToParticipants_unlocked(MessageTypeChat, payload)
	room.mu.RUnlock()

	// Should not send anything to client
	select {
	case <-client.send:
		t.Fatal("expected no message to be sent due to marshal error")
	case <-time.After(50 * time.Millisecond):
		// Success: no message sent
	}
}
