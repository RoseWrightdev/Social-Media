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
	if msg, err := json.Marshal(Message{Event: EventGetRecentChats, Payload: recentChats}); err == nil {
		select {
		case client.send <- msg:
		default:
			slog.Warn("Failed to send recent chats to client - channel full", "ClientId", client.ID, "RoomId", r.ID)
		}
	} else {
		slog.Error("Failed to marshal recent chats", "error", err, "ClientId", client.ID, "RoomId", r.ID)
	}
}

// handleRaiseHand processes requests for participants to raise their hands.
// This handler allows participants to signal that they want to speak or
// ask a question during the meeting.
//
// Operation Flow:
//  1. Validate payload structure
//  2. Add client to the hand-raising queue
//  3. Broadcast the event to all participants
//
// Queue Management:
// The hand-raising system maintains an ordered queue so hosts can see
// who raised their hand first and manage speaking order appropriately.
//
// Permissions:
// Only participants and above can raise hands. Waiting room users
// cannot raise hands until they are admitted to the meeting.
//
// Broadcasting:
// The event is broadcast to all participants so everyone can see
// who has their hand raised and maintain meeting awareness.
//
// Parameters:
//   - client: The client raising their hand
//   - event: The event type (should be EventRaiseHand)
//   - payload: The raw payload containing hand raise information
func (r *Room) handleRaiseHand(client *Client, event Event, payload any) {
	p, ok := assertPayload[RaiseHandPayload](payload)
	logHelper(ok, client.ID, GetFuncName(), r.ID)
	if !ok {
		return
	}
	r.raiseHand(p)
	r.broadcast(event, p, HasParticipantPermission())
}

// handleLowerHand processes requests for participants to lower their hands.
// This handler allows participants to withdraw their request to speak,
// removing them from the hand-raising queue.
//
// Use Cases:
//   - Participant no longer wants to speak
//   - Host has already acknowledged the participant
//   - Participant wants to yield their turn to others
//
// Queue Management:
// When a participant lowers their hand, they are removed from the
// hand-raising queue, potentially changing the order for remaining participants.
//
// Permissions:
// Only participants and above can lower hands. This matches the raise hand
// permissions to ensure consistent hand management capabilities.
//
// Broadcasting:
// The event is broadcast to all participants so everyone can see
// the updated hand-raising status and queue order.
//
// Parameters:
//   - client: The client lowering their hand
//   - event: The event type (should be EventLowerHand)
//   - payload: The raw payload containing hand lower information
func (r *Room) handleLowerHand(client *Client, event Event, payload any) {
	p, ok := assertPayload[LowerHandPayload](payload)
	logHelper(ok, client.ID, GetFuncName(), r.ID)
	if !ok {
		return
	}
	r.lowerHand(p)
	r.broadcast(event, p, HasParticipantPermission())
}

// handleRequestWaiting processes requests from clients to join the waiting room.
// This handler is typically called by clients who are not yet admitted to
// the main meeting and need host approval to participate.
//
// Waiting Room Flow:
//  1. Client requests to join the waiting room
//  2. Request is broadcast to hosts for approval
//  3. Hosts can then accept or deny the waiting request
//
// Security Model:
// The waiting room provides a security layer where hosts can control
// who joins the meeting, preventing unauthorized participants and
// enabling moderated meetings.
//
// Broadcasting:
// The request is broadcast only to hosts, as they are the only ones
// who can approve or deny waiting room requests. Regular participants
// don't need to see these requests.
//
// Use Cases:
//   - New clients joining a moderated meeting
//   - Clients who were temporarily disconnected
//   - Late-arriving invited participants
//
// Parameters:
//   - client: The client requesting to join the waiting room
//   - event: The event type (should be EventRequestWaiting)
//   - payload: The raw payload containing waiting request information
func (r *Room) handleRequestWaiting(client *Client, event Event, payload any) {
	p, ok := assertPayload[RequestWaitingPayload](payload)
	logHelper(ok, client.ID, GetFuncName(), r.ID)
	if !ok {
		return
	}
	r.broadcast(event, p, HasHostPermission())
}

// handleAcceptWaiting processes host decisions to accept clients from the waiting room.
// This handler promotes waiting clients to full participants, granting them
// access to the main meeting features.
//
// Security Validation:
//  1. Verify the target client is actually in the waiting room
//  2. Prevent acceptance of non-existent or already-accepted clients
//  3. Log all acceptance actions for audit purposes
//
// State Transitions:
// When a client is accepted:
//   - Removed from waiting room map
//   - Added to participants map
//   - Role changed to participant
//   - Full meeting features become available
//
// Host Authority:
// Only hosts can accept waiting clients, maintaining meeting control
// and preventing unauthorized admissions by regular participants.
//
// Broadcasting:
// The acceptance is broadcast to all clients (nil permission set)
// so everyone can see the new participant join the meeting.
//
// Error Handling:
// If the target client doesn't exist in the waiting room, the request
// is logged as a warning and ignored to prevent security issues.
//
// Parameters:
//   - client: The host accepting the waiting client
//   - event: The event type (should be EventAcceptWaiting)
//   - payload: The raw payload containing the client ID to accept
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

// handleDenyWaiting processes host decisions to deny clients from the waiting room.
// This handler removes clients from the waiting room without granting them
// participant access, effectively rejecting their request to join.
//
// Operation Flow:
//  1. Validate the denial request payload
//  2. Find the target client in the waiting room
//  3. Remove them from the waiting room if found
//  4. Broadcast the denial to waiting room participants
//
// Client Removal:
// When a client is denied, they are completely removed from the waiting
// room and must make a new request if they want to try joining again.
//
// Host Authority:
// Only hosts can deny waiting clients, maintaining control over meeting
// access and preventing abuse by regular participants.
//
// Broadcasting:
// The denial is broadcast to clients with waiting permissions so they
// can update their UI to reflect the client's removal from the queue.
//
// Use Cases:
//   - Rejecting uninvited or unauthorized participants
//   - Managing meeting size and participation
//   - Removing disruptive or inappropriate requests
//
// Parameters:
//   - client: The host denying the waiting client
//   - event: The event type (should be EventDenyWaiting)
//   - payload: The raw payload containing the client ID to deny
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

// handleRequestScreenshare processes participant requests to share their screen.
// This handler forwards screenshare requests to hosts who can approve or
// deny the request based on meeting policies and current conditions.
//
// Request Flow:
//  1. Participant requests permission to share screen
//  2. Request is broadcast to hosts for approval
//  3. Hosts can accept or deny the screenshare request
//
// Permission Model:
// Screensharing typically requires host approval to:
//   - Prevent unauthorized screen sharing
//   - Manage meeting flow and focus
//   - Ensure appropriate content is shared
//
// Broadcasting:
// The request is broadcast only to hosts, as they are the decision-makers
// for screenshare approvals. Regular participants don't need to see
// these requests unless they become hosts.
//
// Use Cases:
//   - Presentations during meetings
//   - Collaborative work sessions
//   - Technical support or training scenarios
//   - Sharing documents or applications
//
// Parameters:
//   - client: The participant requesting to share screen
//   - event: The event type (should be EventRequestScreenshare)
//   - payload: The raw payload containing screenshare request information
func (r *Room) handleRequestScreenshare(client *Client, event Event, payload any) {
	p, ok := assertPayload[RequestScreensharePayload](payload)
	logHelper(ok, client.ID, GetFuncName(), r.ID)
	if !ok {
		return
	}
	r.broadcast(event, p, HasHostPermission())
}

// handleAcceptScreenshare processes host decisions to approve screenshare requests.
// This handler grants screenshare permissions to the requesting participant
// and notifies them directly of the approval.
//
// Operation Flow:
//  1. Validate the acceptance payload
//  2. Find the requesting participant in the room
//  3. Grant them screenshare permissions if found
//  4. Send direct notification to the approved participant
//
// Direct Notification:
// Unlike other handlers that broadcast to groups, this handler sends
// the approval message directly to the requesting participant's WebSocket
// connection to provide immediate feedback.
//
// State Management:
// When screenshare is accepted, the participant is added to the
// screenshare role, granting them elevated permissions for screen sharing.
//
// Error Handling:
//   - JSON marshalling errors are logged but don't crash the handler
//   - Non-existent participants are handled gracefully
//   - Channel send failures are managed with direct channel operations
//
// Security:
// Only the specific requesting participant receives the acceptance
// notification, preventing unauthorized screenshare activations.
//
// Parameters:
//   - client: The host accepting the screenshare request
//   - event: The event type (should be EventAcceptScreenshare)
//   - payload: The raw payload containing the participant ID to approve
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

// handleDenyScreenshare processes host decisions to deny screenshare requests.
// This handler rejects the participant's request to share their screen
// and notifies them directly of the denial.
//
// Operation Flow:
//  1. Validate the denial payload
//  2. Find the requesting participant to notify them
//  3. Send direct denial notification to the participant
//  4. Broadcast the denial decision to hosts
//
// Dual Notification Pattern:
// This handler implements a dual notification system:
//   - Direct message to the denied participant (immediate feedback)
//   - Broadcast to hosts (awareness of the denial decision)
//
// User Experience:
// The direct notification ensures the requesting participant receives
// immediate feedback about their denial, preventing them from waiting
// indefinitely for a response.
//
// Error Handling:
//   - JSON marshalling errors are logged but don't prevent the broadcast
//   - Non-existent participants are handled gracefully in the loop
//   - Channel send operations use direct sends for immediate delivery
//
// Host Awareness:
// The broadcast to hosts ensures all meeting moderators are aware
// of denial decisions for coordination and meeting management.
//
// Parameters:
//   - client: The host denying the screenshare request
//   - event: The event type (should be EventDenyScreenshare)
//   - payload: The raw payload containing the participant ID to deny
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
