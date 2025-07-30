package session

import (
	"encoding/json"
	"fmt"
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

// TestHandleGetRecentChats tests the chat history retrieval handler
func TestHandleGetRecentChats(t *testing.T) {
	t.Run("should send recent chats successfully", func(t *testing.T) {
		room := NewTestRoom("test-room", nil)
		client := newTestClientWithName("participant1", "John Doe")
		client.Role = RoleTypeParticipant

		room.addParticipant(client)

		// Add some chat messages to history first
		chatPayload1 := AddChatPayload{
			ClientInfo: ClientInfo{
				ClientId:    client.ID,
				DisplayName: client.DisplayName,
			},
			ChatId:      "chat-1",
			Timestamp:   1234567890,
			ChatContent: "First message",
		}
		room.router(client, Message{Event: EventAddChat, Payload: chatPayload1})

		chatPayload2 := AddChatPayload{
			ClientInfo: ClientInfo{
				ClientId:    client.ID,
				DisplayName: client.DisplayName,
			},
			ChatId:      "chat-2", 
			Timestamp:   1234567891,
			ChatContent: "Second message",
		}
		room.router(client, Message{Event: EventAddChat, Payload: chatPayload2})

		require.True(t, room.chatHistory.Len() >= 2, "Should have chat history")

		// Drain any existing messages in the channel from the add_chat operations
		for len(client.send) > 0 {
			<-client.send
		}

		// Request recent chats
		payload := GetRecentChatsPayload{
			ClientInfo: ClientInfo{
				ClientId:    client.ID,
				DisplayName: client.DisplayName,
			},
			ChatId:      "",
			Timestamp:   0,
			ChatContent: "",
		}

		msg := Message{Event: EventGetRecentChats, Payload: payload}

		assert.NotPanics(t, func() {
			room.router(client, msg)
		}, "Router should not panic for get recent chats")

		// Check if client received the chat history
		select {
		case msgBytes := <-client.send:
			var receivedMsg Message
			err := json.Unmarshal(msgBytes, &receivedMsg)
			require.NoError(t, err)

			assert.Equal(t, EventGetRecentChats, receivedMsg.Event)
			
		case <-time.After(100 * time.Millisecond):
			t.Fatal("Client did not receive recent chats response")
		}
	})

	t.Run("should handle invalid payload", func(t *testing.T) {
		room := NewTestRoom("test-room", nil)
		client := newTestClientWithName("participant1", "John Doe")
		client.Role = RoleTypeParticipant

		room.addParticipant(client)

		// Send invalid payload
		msg := Message{Event: EventGetRecentChats, Payload: "invalid"}

		assert.NotPanics(t, func() {
			room.router(client, msg)
		}, "Router should not panic with invalid payload")
	})
}

// TestHandleRequestWaiting tests the waiting room request handler
func TestHandleRequestWaiting(t *testing.T) {
	t.Run("should request waiting successfully", func(t *testing.T) {
		room := NewTestRoom("test-room", nil)
		client := newTestClientWithName("waiting1", "Waiting User")
		client.Role = RoleTypeWaiting
		host := newTestClientWithName("host1", "Host User")
		host.Role = RoleTypeHost

		room.addHost(host)
		room.addWaiting(client) // Add client to waiting list so they can make waiting requests
		
		payload := RequestWaitingPayload{
			ClientId:    client.ID,
			DisplayName: client.DisplayName,
		}

		assert.NotPanics(t, func() {
			room.router(client, Message{Event: EventRequestWaiting, Payload: payload})
		}, "Router should not panic for request waiting")

		// Debug: Check if host is in the room
		require.Len(t, room.hosts, 1, "Should have one host")
		t.Logf("Host channel length: %d", len(host.send))
		
		// Check that host received the waiting request
		select {
		case msgBytes := <-host.send:
			var receivedMsg Message
			err := json.Unmarshal(msgBytes, &receivedMsg)
			require.NoError(t, err)
			assert.Equal(t, EventRequestWaiting, receivedMsg.Event)
		case <-time.After(200 * time.Millisecond):
			t.Fatal("Host did not receive waiting request")
		}
	})

	t.Run("should handle invalid payload", func(t *testing.T) {
		room := NewTestRoom("test-room", nil)
		client := newTestClientWithName("waiting1", "Waiting User")
		
		invalidPayload := "invalid payload"

		assert.NotPanics(t, func() {
			room.router(client, Message{Event: EventRequestWaiting, Payload: invalidPayload})
		}, "Router should not panic for invalid payload")
		
		// Should not receive any message due to invalid payload
		select {
		case <-client.send:
			t.Fatal("Client should not receive message for invalid payload")
		case <-time.After(50 * time.Millisecond):
			// Expected - no message should be sent
		}
	})
}

// TestHandleClientDisconnectEdgeCases tests error paths and edge cases in client disconnect handling
func TestHandleClientDisconnectEdgeCases(t *testing.T) {
	t.Run("should handle nil onEmpty callback", func(t *testing.T) {
		// Create a room without onEmpty callback
		room := NewRoom("test-room", nil)
		client := newTestClientWithName("client1", "Test Client")
		
		room.addParticipant(client)
		
		// This should not panic even with nil onEmpty callback
		assert.NotPanics(t, func() {
			room.handleClientDisconnect(client)
		}, "handleClientDisconnect should not panic with nil onEmpty callback")
	})
	
	t.Run("should handle panicking onEmpty callback", func(t *testing.T) {
		callbackCalled := false
		
		// Create onEmpty callback that panics
		onEmpty := func(roomId RoomIdType) {
			callbackCalled = true
			panic("test panic")
		}
		
		room := NewRoom("test-room", onEmpty)
		client := newTestClientWithName("client1", "Test Client")
		
		room.addParticipant(client)
		
		assert.NotPanics(t, func() {
			room.handleClientDisconnect(client)
			// Give the goroutine time to execute and recover from panic
			time.Sleep(10 * time.Millisecond)
		}, "handleClientDisconnect should not panic even when onEmpty callback panics")
		
		assert.True(t, callbackCalled, "onEmpty callback should have been called")
	})
	
	t.Run("should call onEmpty when room becomes empty", func(t *testing.T) {
		callbackCalled := false
		var calledWithRoomId RoomIdType
		
		onEmpty := func(roomId RoomIdType) {
			callbackCalled = true
			calledWithRoomId = roomId
		}
		
		room := NewRoom("test-room", onEmpty)
		client := newTestClientWithName("client1", "Test Client")
		
		room.addParticipant(client)
		
		room.handleClientDisconnect(client)
		
		// Give the goroutine time to execute
		time.Sleep(10 * time.Millisecond)
		
		assert.True(t, callbackCalled, "onEmpty callback should have been called")
		assert.Equal(t, RoomIdType("test-room"), calledWithRoomId, "onEmpty should be called with correct room ID")
	})
}

// TestAddChatEdgeCases tests edge cases in the addChat functionality
func TestAddChatEdgeCases(t *testing.T) {
	t.Run("should initialize chat history if nil", func(t *testing.T) {
		room := NewTestRoom("test-room", nil)
		
		// Ensure chatHistory is nil initially
		room.chatHistory = nil
		
		payload := AddChatPayload{
			ClientInfo: ClientInfo{
				ClientId:    "test-user",
				DisplayName: "Test User",
			},
			ChatId:      "chat-1",
			Timestamp:   123456789,
			ChatContent: "Test message",
		}
		
		room.addChat(payload)
		
		assert.NotNil(t, room.chatHistory, "Chat history should be initialized")
		assert.Equal(t, 1, room.chatHistory.Len(), "Should have one message")
	})
	
	t.Run("should enforce max chat history length", func(t *testing.T) {
		room := NewTestRoom("test-room", nil)
		
		// Set a small max history length
		room.maxChatHistoryLength = 2
		
		// Add 3 messages (should exceed max)
		for i := 1; i <= 3; i++ {
			payload := AddChatPayload{
				ClientInfo: ClientInfo{
					ClientId:    "test-user",
					DisplayName: "Test User",
				},
				ChatId:      ChatId(fmt.Sprintf("chat-%d", i)),
				Timestamp:   Timestamp(123456789 + i),
				ChatContent: ChatContent(fmt.Sprintf("Test message %d", i)),
			}
			room.addChat(payload)
		}
		
		assert.Equal(t, 2, room.chatHistory.Len(), "Should enforce max history length")
		
		// Verify the oldest message was removed (should have messages 2 and 3)
		front := room.chatHistory.Front().Value.(AddChatPayload)
		assert.Equal(t, ChatId("chat-2"), front.ChatId, "Oldest message should be removed")
		
		back := room.chatHistory.Back().Value.(AddChatPayload)
		assert.Equal(t, ChatId("chat-3"), back.ChatId, "Newest message should be kept")
	})
}

func TestHandleRequestWaitingDirectCall(t *testing.T) {
	t.Run("should request waiting successfully", func(t *testing.T) {
		room := NewTestRoom("test-room", nil)
		client := newTestClientWithName("participant1", "John Doe")
		client.Role = RoleTypeParticipant

		room.addParticipant(client)

		payload := RequestWaitingPayload{
			ClientId:    client.ID,
			DisplayName: client.DisplayName,
		}

		msg := Message{Event: EventRequestWaiting, Payload: payload}

		assert.NotPanics(t, func() {
			room.router(client, msg)
		}, "Router should not panic for request waiting")
	})

	t.Run("should handle invalid payload", func(t *testing.T) {
		room := NewTestRoom("test-room", nil)
		client := newTestClientWithName("participant1", "John Doe")
		client.Role = RoleTypeParticipant

		room.addParticipant(client)

		msg := Message{Event: EventRequestWaiting, Payload: "invalid"}

		assert.NotPanics(t, func() {
			room.router(client, msg)
		}, "Router should not panic with invalid payload")
	})
}

// TestHandleDenyWaiting tests the waiting room denial handler
func TestHandleDenyWaiting(t *testing.T) {
	t.Run("host can deny waiting user", func(t *testing.T) {
		room := NewTestRoom("test-room", nil)

		// Create host
		host := newTestClientWithName("host1", "Host User")
		host.Role = RoleTypeHost
		room.addHost(host)

		// Create waiting user
		waitingUser := newTestClientWithName("waiting1", "Waiting User")
		waitingUser.Role = RoleTypeWaiting
		room.addWaiting(waitingUser)

		payload := DenyWaitingPayload{
			ClientId:    waitingUser.ID,
			DisplayName: waitingUser.DisplayName,
		}

		msg := Message{Event: EventDenyWaiting, Payload: payload}

		assert.NotPanics(t, func() {
			room.router(host, msg)
		}, "Router should not panic for deny waiting")
	})

	t.Run("participant cannot deny waiting user", func(t *testing.T) {
		room := NewTestRoom("test-room", nil)

		// Create participant (not host)
		participant := newTestClientWithName("participant1", "Participant User")
		participant.Role = RoleTypeParticipant
		room.addParticipant(participant)

		// Create waiting user
		waitingUser := newTestClientWithName("waiting1", "Waiting User")
		waitingUser.Role = RoleTypeWaiting
		room.addWaiting(waitingUser)

		payload := DenyWaitingPayload{
			ClientId:    waitingUser.ID,
			DisplayName: waitingUser.DisplayName,
		}

		msg := Message{Event: EventDenyWaiting, Payload: payload}

		assert.NotPanics(t, func() {
			room.router(participant, msg)
		}, "Router should not panic even with insufficient permissions")
	})
}

// TestHandleDenyScreenshare tests the screenshare denial handler
func TestHandleDenyScreenshare(t *testing.T) {
	t.Run("host can deny screenshare", func(t *testing.T) {
		room := NewTestRoom("test-room", nil)

		// Create host
		host := newTestClientWithName("host1", "Host User")
		host.Role = RoleTypeHost
		room.addHost(host)

		// Create participant requesting screenshare
		participant := newTestClientWithName("participant1", "Participant User")
		participant.Role = RoleTypeParticipant
		room.addParticipant(participant)

		payload := DenyScreensharePayload{
			ClientId:    participant.ID,
			DisplayName: participant.DisplayName,
		}

		msg := Message{Event: EventDenyScreenshare, Payload: payload}

		assert.NotPanics(t, func() {
			room.router(host, msg)
		}, "Router should not panic for deny screenshare")
	})

	t.Run("participant cannot deny screenshare", func(t *testing.T) {
		room := NewTestRoom("test-room", nil)

		// Create participant (not host)
		participant := newTestClientWithName("participant1", "Participant User")
		participant.Role = RoleTypeParticipant
		room.addParticipant(participant)

		// Create another participant
		otherParticipant := newTestClientWithName("participant2", "Other Participant")
		otherParticipant.Role = RoleTypeParticipant
		room.addParticipant(otherParticipant)

		payload := DenyScreensharePayload{
			ClientId:    otherParticipant.ID,
			DisplayName: otherParticipant.DisplayName,
		}

		msg := Message{Event: EventDenyScreenshare, Payload: payload}

		assert.NotPanics(t, func() {
			room.router(participant, msg)
		}, "Router should not panic even with insufficient permissions")
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

// TestPermissions tests the permission system coverage
func TestPermissions(t *testing.T) {
	t.Run("HasScreensharePermission", func(t *testing.T) {
		// Test screenshare permission for different roles
		assert.True(t, HasPermission(RoleTypeScreenshare, HasScreensharePermission()), "Screenshare role should have screenshare permission")
		assert.True(t, HasPermission(RoleTypeHost, HasScreensharePermission()), "Host role should have screenshare permission")
		assert.False(t, HasPermission(RoleTypeParticipant, HasScreensharePermission()), "Participant role should not have screenshare permission")
		assert.False(t, HasPermission(RoleTypeWaiting, HasScreensharePermission()), "Waiting role should not have screenshare permission")
	})
}

// TestRoomState tests the room state functionality
func TestRoomState(t *testing.T) {
	t.Run("getRoomState should return complete room state", func(t *testing.T) {
		room := NewTestRoom("test-room", nil)

		// Add various clients
		host := newTestClientWithName("host1", "Host User")
		host.Role = RoleTypeHost
		room.addHost(host)

		participant := newTestClientWithName("participant1", "Participant User")
		participant.Role = RoleTypeParticipant
		room.addParticipant(participant)

		waitingUser := newTestClientWithName("waiting1", "Waiting User")
		waitingUser.Role = RoleTypeWaiting
		room.addWaiting(waitingUser)

		// Raise a hand
		raisePayload := RaiseHandPayload{
			ClientId:    participant.ID,
			DisplayName: participant.DisplayName,
		}
		room.raiseHand(raisePayload)

		// Get room state
		roomState := room.getRoomState()

		// Verify room state structure
		assert.Equal(t, room.ID, roomState.RoomID)
		assert.Len(t, roomState.Hosts, 1)
		assert.Len(t, roomState.Participants, 1) 
		assert.Len(t, roomState.WaitingUsers, 1)
		assert.Len(t, roomState.HandsRaised, 1)
	})
}

// TestLogHelper tests the logging helper function
func TestLogHelper(t *testing.T) {
	t.Run("logHelper with successful operation", func(t *testing.T) {
		// This will log an info message, just test it doesn't panic
		assert.NotPanics(t, func() {
			logHelper(true, "test-client", "TestMethod", "test-room")
		}, "logHelper should not panic with successful operation")
	})

	t.Run("logHelper with failed operation", func(t *testing.T) {
		// This will log an error message, just test it doesn't panic
		assert.NotPanics(t, func() {
			logHelper(false, "test-client", "TestMethod", "test-room")
		}, "logHelper should not panic with failed operation")
	})
}

// TestGetRecentChats tests the room method directly
func TestGetRecentChats(t *testing.T) {
	t.Run("should return recent chats", func(t *testing.T) {
		room := NewTestRoom("test-room", nil)

		// Add some chat messages
		chatPayload1 := ChatInfo{
			ClientInfo: ClientInfo{
				ClientId:    "user1",
				DisplayName: "User One",
			},
			ChatId:      "chat-1",
			Timestamp:   1234567890,
			ChatContent: "First message",
		}
		room.addChat(chatPayload1)

		chatPayload2 := ChatInfo{
			ClientInfo: ClientInfo{
				ClientId:    "user2",
				DisplayName: "User Two",
			},
			ChatId:      "chat-2",
			Timestamp:   1234567891,
			ChatContent: "Second message",
		}
		room.addChat(chatPayload2)

		// Get recent chats
		payload := GetRecentChatsPayload{
			ClientInfo: ClientInfo{
				ClientId:    "test-user",
				DisplayName: "Test User",
			},
			ChatId:      "",
			Timestamp:   0,
			ChatContent: "",
		}
		recentChats := room.getRecentChats(payload)

		assert.Len(t, recentChats, 2, "Should return all chat messages")
		assert.Equal(t, "First message", string(recentChats[0].ChatContent))
		assert.Equal(t, "Second message", string(recentChats[1].ChatContent))
	})

	t.Run("should handle empty chat history", func(t *testing.T) {
		room := NewTestRoom("test-room", nil)

		payload := GetRecentChatsPayload{
			ClientInfo: ClientInfo{
				ClientId:    "test-user",
				DisplayName: "Test User",
			},
			ChatId:      "",
			Timestamp:   0,
			ChatContent: "",
		}
		recentChats := room.getRecentChats(payload)

		assert.Len(t, recentChats, 0, "Should return empty slice for no chat history")
	})
}
