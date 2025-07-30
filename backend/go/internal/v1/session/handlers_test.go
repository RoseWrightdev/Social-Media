package session

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// newTestClientWithName creates a test client with both ID and display name
func newTestClientWithName(id ClientIdType, displayName DisplayNameType) *Client {
	client := newTestClient(id)
	client.DisplayName = displayName
	return client
}

// TestHandleAddChat tests the chat message addition handler through the router
func TestHandleAddChat(t *testing.T) {
	t.Run("should add valid chat message successfully", func(t *testing.T) {
		room := NewTestRoom("test-room", nil)
		client := newTestClientWithName("participant1", "John Doe")
		client.Role = RoleTypeParticipant

		// Add client to participants
		room.addParticipant(client)

		// Create valid chat payload
		payload := AddChatPayload{
			ClientInfo: ClientInfo{
				ClientId:    client.ID,
				DisplayName: client.DisplayName,
			},
			ChatId:      "chat-1",
			Timestamp:   1234567890,
			ChatContent: "Hello world!",
		}

		msg := Message{Event: EventAddChat, Payload: payload}

		// Test that router processes the message without panic
		assert.NotPanics(t, func() {
			room.router(client, msg)
		}, "Router should not panic for valid chat message")

		// Verify chat was added (check chat history length)
		assert.True(t, room.chatHistory.Len() > 0, "Chat message should be added to history")
	})

	t.Run("should fail with empty display name", func(t *testing.T) {
		room := NewTestRoom("test-room", nil)
		client := newTestClient("participant1")
		client.Role = RoleTypeParticipant
		client.DisplayName = "" // Empty display name

		room.addParticipant(client)

		payload := AddChatPayload{
			ClientInfo: ClientInfo{
				ClientId:    client.ID,
				DisplayName: client.DisplayName, // Empty
			},
			ChatId:      "chat-1",
			Timestamp:   1234567890,
			ChatContent: "Hello world!",
		}

		msg := Message{Event: EventAddChat, Payload: payload}

		initialChatCount := room.chatHistory.Len()

		// Should not panic but should not add the message
		assert.NotPanics(t, func() {
			room.router(client, msg)
		}, "Router should not panic even with invalid data")

		// Chat should not be added due to validation failure
		assert.Equal(t, initialChatCount, room.chatHistory.Len(), "Invalid chat should not be added")
	})

	t.Run("should fail with empty chat content", func(t *testing.T) {
		room := NewTestRoom("test-room", nil)
		client := newTestClient("participant1")
		client.Role = RoleTypeParticipant

		room.addParticipant(client)

		payload := AddChatPayload{
			ClientInfo: ClientInfo{
				ClientId:    client.ID,
				DisplayName: client.DisplayName,
			},
			ChatId:      "chat-1",
			Timestamp:   1234567890,
			ChatContent: "", // Empty content
		}

		msg := Message{Event: EventAddChat, Payload: payload}

		initialChatCount := room.chatHistory.Len()

		assert.NotPanics(t, func() {
			room.router(client, msg)
		}, "Router should not panic with empty content")

		assert.Equal(t, initialChatCount, room.chatHistory.Len(), "Empty chat should not be added")
	})
}

// TestHandleDeleteChat tests the chat message deletion handler
func TestHandleDeleteChat(t *testing.T) {
	t.Run("should delete chat message successfully", func(t *testing.T) {
		room := NewTestRoom("test-room", nil)
		client := newTestClient("participant1")
		client.Role = RoleTypeParticipant

		room.addParticipant(client)

		// First add a chat message
		addClient := newTestClientWithName("participant1", "John Doe")
		addClient.Role = RoleTypeParticipant
		room.addParticipant(addClient)

		addPayload := AddChatPayload{
			ClientInfo: ClientInfo{
				ClientId:    addClient.ID,
				DisplayName: addClient.DisplayName,
			},
			ChatId:      "chat-1",
			Timestamp:   1234567890,
			ChatContent: "Message to delete",
		}

		addMsg := Message{Event: EventAddChat, Payload: addPayload}
		room.router(addClient, addMsg)

		initialChatCount := room.chatHistory.Len()
		require.True(t, initialChatCount > 0, "Chat should be added first")

		// Now delete the message
		deletePayload := DeleteChatPayload{
			ClientInfo: ClientInfo{
				ClientId:    client.ID,
				DisplayName: client.DisplayName,
			},
			ChatId:      "chat-1",
			Timestamp:   1234567890,
			ChatContent: "", // Empty for deletion
		}

		deleteMsg := Message{Event: EventDeleteChat, Payload: deletePayload}

		assert.NotPanics(t, func() {
			room.router(client, deleteMsg)
		}, "Router should not panic for delete chat")
	})
}

// TestHandleRaiseHand tests the hand raising functionality
func TestHandleRaiseHand(t *testing.T) {
	t.Run("should raise hand successfully", func(t *testing.T) {
		room := NewTestRoom("test-room", nil)
		client := newTestClient("participant1")
		client.Role = RoleTypeParticipant

		room.addParticipant(client)

		payload := RaiseHandPayload{
			ClientId:    client.ID,
			DisplayName: client.DisplayName,
		}

		msg := Message{Event: EventRaiseHand, Payload: payload}

		assert.NotPanics(t, func() {
			room.router(client, msg)
		}, "Router should not panic for raise hand")

		// Verify hand was raised
		_, handRaised := room.raisingHand[client.ID]
		assert.True(t, handRaised, "Client should be in raising hand map")
	})

	t.Run("should lower hand successfully", func(t *testing.T) {
		room := NewTestRoom("test-room", nil)
		client := newTestClient("participant1")
		client.Role = RoleTypeParticipant

		room.addParticipant(client)

		// First raise the hand
		raisePayload := RaiseHandPayload{
			ClientId:    client.ID,
			DisplayName: client.DisplayName,
		}
		room.raiseHand(raisePayload)
		require.True(t, len(room.raisingHand) > 0, "Hand should be raised first")

		// Now lower it
		payload := LowerHandPayload{
			ClientId:    client.ID,
			DisplayName: client.DisplayName,
		}

		msg := Message{Event: EventLowerHand, Payload: payload}

		assert.NotPanics(t, func() {
			room.router(client, msg)
		}, "Router should not panic for lower hand")

		// Verify hand was lowered
		_, handRaised := room.raisingHand[client.ID]
		assert.False(t, handRaised, "Client should not be in raising hand map after lowering")
	})
}

// TestHandleWaitingRoomOperations tests waiting room management
func TestHandleWaitingRoomOperations(t *testing.T) {
	t.Run("host can accept waiting user", func(t *testing.T) {
		room := NewTestRoom("test-room", nil)

		// Create host
		host := newTestClient("host1")
		host.Role = RoleTypeHost
		room.addHost(host)

		// Create waiting user
		waitingUser := newTestClient("waiting1")
		waitingUser.Role = RoleTypeWaiting
		room.addWaiting(waitingUser)

		require.True(t, len(room.waiting) > 0, "Should have waiting user")

		// Host accepts waiting user
		payload := AcceptWaitingPayload{
			ClientId:    waitingUser.ID,
			DisplayName: waitingUser.DisplayName,
		}

		msg := Message{Event: EventAcceptWaiting, Payload: payload}

		assert.NotPanics(t, func() {
			room.router(host, msg)
		}, "Router should not panic for accept waiting")
	})

	t.Run("participant cannot accept waiting user", func(t *testing.T) {
		room := NewTestRoom("test-room", nil)

		// Create participant (not host)
		participant := newTestClient("participant1")
		participant.Role = RoleTypeParticipant
		room.addParticipant(participant)

		// Create waiting user
		waitingUser := newTestClient("waiting1")
		waitingUser.Role = RoleTypeWaiting
		room.addWaiting(waitingUser)

		payload := AcceptWaitingPayload{
			ClientId:    waitingUser.ID,
			DisplayName: waitingUser.DisplayName,
		}

		msg := Message{Event: EventAcceptWaiting, Payload: payload}

		// This should not panic but should be ignored due to permission check
		assert.NotPanics(t, func() {
			room.router(participant, msg)
		}, "Router should not panic even with insufficient permissions")

		// Waiting user should still be waiting (not moved to participants)
		_, stillWaiting := room.waiting[waitingUser.ID]
		assert.True(t, stillWaiting, "User should still be waiting when non-host tries to accept")
	})
}

// TestHandleScreenshareOperations tests screen sharing management
func TestHandleScreenshareOperations(t *testing.T) {
	t.Run("participant can request screenshare", func(t *testing.T) {
		room := NewTestRoom("test-room", nil)

		participant := newTestClient("participant1")
		participant.Role = RoleTypeParticipant
		room.addParticipant(participant)

		payload := RequestScreensharePayload{
			ClientId:    participant.ID,
			DisplayName: participant.DisplayName,
		}

		msg := Message{Event: EventRequestScreenshare, Payload: payload}

		assert.NotPanics(t, func() {
			room.router(participant, msg)
		}, "Router should not panic for screenshare request")
	})

	t.Run("host can accept screenshare", func(t *testing.T) {
		room := NewTestRoom("test-room", nil)

		// Create host
		host := newTestClient("host1")
		host.Role = RoleTypeHost
		room.addHost(host)

		// Create participant
		participant := newTestClient("participant1")
		participant.Role = RoleTypeParticipant
		room.addParticipant(participant)

		payload := AcceptScreensharePayload{
			ClientId:    participant.ID,
			DisplayName: participant.DisplayName,
		}

		msg := Message{Event: EventAcceptScreenshare, Payload: payload}

		assert.NotPanics(t, func() {
			room.router(host, msg)
		}, "Router should not panic for screenshare acceptance")
	})
}

// TestHandlerBroadcasting tests that handlers properly broadcast messages
func TestHandlerBroadcasting(t *testing.T) {
	t.Run("chat message is broadcast to all participants", func(t *testing.T) {
		room := NewTestRoom("test-room", nil)

		// Create sender
		sender := newTestClientWithName("sender", "Sender Name")
		sender.Role = RoleTypeParticipant
		room.addParticipant(sender)

		// Create receiver
		receiver := newTestClientWithName("receiver", "Receiver Name")
		receiver.Role = RoleTypeParticipant
		room.addParticipant(receiver)

		payload := AddChatPayload{
			ClientInfo: ClientInfo{
				ClientId:    sender.ID,
				DisplayName: sender.DisplayName,
			},
			ChatId:      "broadcast-test",
			Timestamp:   1234567890,
			ChatContent: "Hello everyone!",
		}

		msg := Message{Event: EventAddChat, Payload: payload}

		// Send the chat message
		room.router(sender, msg)

		// Check if receiver got the broadcast
		select {
		case msgBytes := <-receiver.send:
			var receivedMsg Message
			err := json.Unmarshal(msgBytes, &receivedMsg)
			require.NoError(t, err)

			assert.Equal(t, EventAddChat, receivedMsg.Event)

		case <-time.After(100 * time.Millisecond):
			t.Fatal("Receiver did not get the broadcast message")
		}
	})
}
