// Package session - handlers.go
//
// This file contains the event handler functions that process incoming WebSocket messages
// from clients. Each handler corresponds to a specific event type and implements the
// business logic for that operation.
//
// Handler Architecture:
// - All handlers follow a consistent pattern: payload validation, business logic, broadcasting
// - Handlers are called by the router after permission checks have passed
// - Handlers assume the room's mutex lock is already held (thread-safe context)
// - Error handling includes logging and graceful degradation
//
// Handler Responsibilities:
//  1. Validate and assert payload types
//  2. Perform additional business logic validation
//  3. Call appropriate room methods to update state
//  4. Broadcast events to relevant clients
//  5. Handle errors gracefully with appropriate logging
//
// Security Notes:
// Handlers include additional security checks beyond basic permission validation,
// such as verifying clients exist in expected states before performing operations.
package session

import (
	"encoding/json"
	"log/slog"
)

// logHelper provides consistent logging for handler operations.
// This utility function logs successful handler calls and payload marshalling failures
// with structured logging fields for debugging and monitoring.
//
// Log Levels:
//   - Info: Successful handler execution
//   - Error: Payload marshalling failures that prevent handler execution
//
// Parameters:
//   - ok: Whether the payload was successfully marshalled
//   - ClientId: The ID of the client making the request
//   - methodName: The name of the handler method being called
//   - RoomId: The ID of the room where the operation is taking place
func logHelper(ok bool, ClientId ClientIdType, methodName string, RoomId RoomIdType) {
	if ok {
		slog.Info("Client called method in room",
			"ClientId", ClientId,
			"RoomId", RoomId,
			"methodName", methodName,
		)
	} else {
		slog.Error("Client called method in room and payload failed to marshall. Aborting request.",
			"ClientId", ClientId,
			"RoomId", RoomId,
			"methodName", methodName,
		)
	}
}

// assertPayload is a generic helper function for type-safe payload validation.
// This function attempts to cast the incoming payload to the expected type,
// returning both the cast result and a boolean indicating success.
//
// Type Safety:
// This function provides compile-time type safety for payload handling while
// allowing runtime validation of the actual payload structure.
//
// Usage Example:
//
//	payload, ok := assertPayload[AddChatPayload](rawPayload)
//	if !ok {
//	    // Handle type assertion failure
//	    return
//	}
//
// Parameters:
//   - payload: The raw payload from the WebSocket message
//
// Returns:
//   - T: The payload cast to the expected type (zero value if assertion fails)
//   - bool: Whether the type assertion was successful
func assertPayload[T any](payload any) (T, bool) {
	p, ok := payload.(T)
	return p, ok
}

// handleAddChat processes requests to add new chat messages to the room.
// This handler validates the chat payload, adds the message to room history,
// and broadcasts it to all participants with appropriate permissions.
//
// Validation Steps:
//  1. Type assertion to ensure payload is AddChatPayload
//  2. Business logic validation using ChatInfo.Validate()
//  3. Content and length checks for security
//
// Security Features:
//   - Input validation prevents empty or oversized messages
//   - Client ID verification ensures authenticated senders
//   - Display name validation prevents anonymous messages
//
// Broadcasting:
// The message is broadcast to all clients with participant-level permissions,
// ensuring only active meeting participants can see chat messages.
//
// Error Handling:
// Validation failures are logged but don't crash the handler. Invalid
// requests are silently dropped to prevent error message spam.
//
// Parameters:
//   - client: The client sending the chat message
//   - event: The event type (should be EventAddChat)
//   - payload: The raw payload containing chat message data
func (r *Room) handleAddChat(client *Client, event Event, payload any) {
	p, ok := assertPayload[AddChatPayload](payload)
	logHelper(ok, client.ID, GetFuncName(), r.ID)
	if !ok {
		return
	}

	// Validate the chat payload
	if err := p.Validate(); err != nil {
		slog.Error("Invalid chat payload", "ClientId", client.ID, "RoomId", r.ID, "error", err)
		return
	}

	r.addChat(p)
	r.broadcast(event, p, HasParticipantPermission())
}

// handleDeleteChat processes requests to remove chat messages from the room history.
// This handler allows participants to delete their own messages or hosts to
// moderate chat content by removing inappropriate messages.
//
// Operation Flow:
//  1. Validate payload structure
//  2. Remove message from chat history using ChatId
//  3. Broadcast deletion event to all participants
//
// Permissions:
// Only participants and above can delete chat messages. The actual authorization
// for who can delete which messages should be implemented at the business logic level.
//
// Broadcasting:
// The deletion event is broadcast to all participants so their UIs can
// update to reflect the removed message.
//
// Note: This handler doesn't implement sender verification - it assumes
// that higher-level permission checks ensure appropriate access control.
//
// Parameters:
//   - client: The client requesting the deletion
//   - event: The event type (should be EventDeleteChat)
//   - payload: The raw payload containing the ChatId to delete
func (r *Room) handleDeleteChat(client *Client, event Event, payload any) {
	p, ok := assertPayload[DeleteChatPayload](payload)
	logHelper(ok, client.ID, GetFuncName(), r.ID)
	if !ok {
		return
	}
	r.deleteChat(p)
	r.broadcast(event, p, HasParticipantPermission())
}

// handleGetRecentChats processes requests for chat history retrieval.
// This handler fetches recent chat messages and sends them directly to the
// requesting client rather than broadcasting to all participants.
//
// Direct Response Pattern:
// Unlike other handlers that broadcast to multiple clients, this handler
// sends the response directly to the requesting client's WebSocket connection.
// This prevents chat history from being unnecessarily sent to all participants.
//
// Error Handling:
//   - Channel full errors are logged as warnings (non-fatal)
//   - JSON marshalling errors are logged as errors
//   - Failed sends don't crash the handler
//
// Use Cases:
//   - Client reconnection (catching up on missed messages)
//   - Late-joining participants (seeing conversation context)
//   - Chat history browsing/searching
//
// Performance Considerations:
// The select statement with default case prevents blocking if the client's
// send channel is full, ensuring the handler doesn't hang indefinitely.
//
// Parameters:
//   - client: The client requesting chat history
//   - event: The event type (should be EventGetRecentChats)
//   - payload: The raw payload containing request parameters
func (r *Room) handleGetRecentChats(client *Client, event Event, payload any) {
	p, ok := assertPayload[GetRecentChatsPayload](payload)
	logHelper(ok, client.ID, GetFuncName(), r.ID)
	if !ok {
		return
	}

	recentChats := r.getRecentChats(p)

	// Send the recent chats directly to the requesting client
	if msg, err := json.Marshal(Message{Event: event, Payload: recentChats}); err == nil {
		select {
		case client.send <- msg:
		default:
			slog.Warn("Failed to send recent chats to client - channel full", "ClientId", client.ID, "RoomId", r.ID)
		}
	} else {
		slog.Error("Failed to marshal recent chats", "error", err, "ClientId", client.ID, "RoomId", r.ID)
	}
}

func (r *Room) handleRaiseHand(client *Client, event Event, payload any) {
	p, ok := assertPayload[RaiseHandPayload](payload)
	logHelper(ok, client.ID, GetFuncName(), r.ID)
	if !ok {
		return
	}
	r.raiseHand(p)
	r.broadcast(event, p, HasParticipantPermission())
}

func (r *Room) handleLowerHand(client *Client, event Event, payload any) {
	p, ok := assertPayload[LowerHandPayload](payload)
	logHelper(ok, client.ID, GetFuncName(), r.ID)
	if !ok {
		return
	}
	r.lowerHand(p)
	r.broadcast(event, p, HasParticipantPermission())
}

func (r *Room) handleRequestWaiting(client *Client, event Event, payload any) {
	p, ok := assertPayload[RequestWaitingPayload](payload)
	logHelper(ok, client.ID, GetFuncName(), r.ID)
	if !ok {
		return
	}
	r.broadcast(event, p, HasHostPermission())
}

func (r *Room) handleAcceptWaiting(client *Client, event Event, payload any) {
	p, ok := assertPayload[AcceptWaitingPayload](payload)
	logHelper(ok, client.ID, GetFuncName(), r.ID)
	if !ok {
		return
	}

	// Security check: Only accept requests for clients that are actually waiting
	waitingClient, exists := r.waiting[p.ClientId]
	if !exists {
		slog.Warn("Attempted to accept non-waiting client", "RequestingClientId", client.ID, "TargetClientId", p.ClientId, "RoomId", r.ID)
		return
	}

	if waitingClient != nil {
		r.deleteWaiting(waitingClient)
		r.addParticipant(waitingClient)
		slog.Info("Client accepted from waiting room", "AcceptedClientId", waitingClient.ID, "AcceptedByHostId", client.ID, "RoomId", r.ID)
	}
	r.broadcast(event, p, nil)
}

func (r *Room) handleDenyWaiting(client *Client, event Event, payload any) {
	p, ok := assertPayload[DenyWaitingPayload](payload)
	logHelper(ok, client.ID, GetFuncName(), r.ID)
	if !ok {
		return
	}
	// Find the waiting client to deny
	var waitingClient *Client
	for _, c := range r.waiting {
		if c.ID == p.ClientId {
			waitingClient = c
			break
		}
	}

	if waitingClient != nil {
		r.deleteWaiting(waitingClient)
	}
	r.broadcast(event, p, HasWaitingPermission())
}

func (r *Room) handleRequestScreenshare(client *Client, event Event, payload any) {
	p, ok := assertPayload[RequestScreensharePayload](payload)
	logHelper(ok, client.ID, GetFuncName(), r.ID)
	if !ok {
		return
	}
	r.broadcast(event, p, HasHostPermission())
}

func (r *Room) handleAcceptScreenshare(client *Client, event Event, payload any) {
	p, ok := assertPayload[AcceptScreensharePayload](payload)
	logHelper(ok, client.ID, GetFuncName(), r.ID)
	if !ok {
		return
	}
	// Find the client to accept for screenshare
	var requestingClient *Client
	for _, c := range r.participants {
		if c.ID == p.ClientId {
			requestingClient = c
			break
		}
	}

	if requestingClient != nil {
		r.addScreenshare(requestingClient)
	}

	if msg, err := json.Marshal(Message{Event: event, Payload: p}); err == nil {
		if requestingClient != nil {
			requestingClient.send <- msg
		}
	} else {
		slog.Error("Failed to marshal payload for AcceptScreenshare", "error", err)
	}
}

func (r *Room) handleDenyScreenshare(client *Client, event Event, payload any) {
	p, ok := assertPayload[DenyScreensharePayload](payload)
	logHelper(ok, client.ID, GetFuncName(), r.ID)
	if !ok {
		return
	}

	if msg, err := json.Marshal(Message{Event: event, Payload: p}); err == nil {
		// Find the client who requested screenshare to notify them of denial
		for _, c := range r.participants {
			if c.ID == p.ClientId {
				c.send <- msg
				break
			}
		}
	} else {
		slog.Error("Failed to marshal payload for DenyScreenshare", "error", err)
	}
	r.broadcast(event, p, HasHostPermission())
}
