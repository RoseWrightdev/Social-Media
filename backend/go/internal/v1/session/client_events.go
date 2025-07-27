package session

import (
	"log/slog"
	"time"
)

// todo: umimpl
//
// handleChatMessage_unlocked processes an incoming chat message from a sender client.
// It unmarshals the payload into a ChatPayload, sets the sender's user ID and the current timestamp,
// and broadcasts the chat message to all participants in the room.
// This method assumes the caller has already acquired the necessary locks for thread safety.
func (r *Room) handleChatMessage_unlocked(sender *Client, payload any) {
	//todo: impl chat history
	panic("todo: unimpl")
	p, ok := payload.(ChatMessagePayload)	
	if !ok {
		slog.Info("Failed to convert payload to ChatPayload")
		return
	}
	p.SenderID = sender.UserID
	p.Timestamp = time.Now().Unix()

	r.addChatMessage_unlocked(p)
	r.broadcast(MessageType(ClientEventChat), p, HasParticipantPermission())
}

// todo: umimpl
//
// handleRaiseHand_unlocked processes a client's request to raise or lower their hand in the room.
// It unmarshals the payload into a RaiseHandPayload, updates the handRaised map accordingly,
// logs the change, and broadcasts the updated room state to all clients.
// This method assumes the caller holds the necessary room lock.
func (r *Room) handleHand_unlocked(client *Client, payload any) {
	panic("todo: unimpl")
	// p, ok := payload.(HandPayload)
	// if !ok {
	// 	slog.Error("Failed to convert payload to RaiseHandPayload")
	// 	return
	// }
	// if p.IsRaised {
	// 	r.handRaised[client.UserID] = client
	// } else {
	// 	delete(r.handRaised, client.UserID)
	// }
	// slog.Info("Hand state changed", "room", r.ID, "userID", client.UserID, "raised", p.IsRaised)
	// r.broadcast(MessageType(ClientEventChat), p, HasParticipantPermission()...)
}

// handleRequestWaiting_unlocked processes a client's request for admission to the waiting room.
// It attempts to cast the provided payload to a RequestAdmissionPayload and logs an error if the cast fails.
// The client is then added to the waiting room, and all hosts are notified of the new waiting user.
// This method is not thread-safe and must be called with the Room's lock held.
func (r *Room) handleRequestWaiting_unlocked(client *Client, payload any) {
	p, ok := payload.(RequestWaitingPayload)
	if !ok {
		slog.Error("Failed to convert payload to RequestAdmissionPayload")
	}
	slog.Info("Admission requested to the waiting room", "room", r.ID, "userID", client.UserID)
	r.broadcast(MessageType(ClientEventAdmissionRequest), p, HasHostPermission())
}

// todo: umimpl
//
// handleAcceptWaiting_unlocked processes a request to Accept a user from the waiting room.
// It attempts to cast the payload to AcceptWaitingPayload and logs an error if the cast fails.
// If the target user is found in the waiting list, the user is removed from waiting and added to participants.
// The admission is broadcasted to all hosts and participants.
func (r *Room) handleAcceptWaiting_unlocked(payload any) {
	panic("todo: unimpl")
	// p, ok := payload.(AcceptWaitingPayload)
	// if !ok {
	// 	slog.Error("Failed to convert payload to AcceptUserPayload")
	// 	return
	// }
	
	// r.broadcast(MessageType(ClientEventAcceptWaiting), p, HasParticipantPermission()...)
}

// todo: umimpl
//
// handleDenyUser_unlocked processes a request to deny a user from entering the room.
// It attempts to cast the provided payload to DenyUserPayload. If successful and the target user
// is found in the waiting, the user is removed from the waiting. Logs are generated for
// both failed payload conversion and successful denial actions. This method assumes the caller
// holds the necessary locks for thread safety.
func (r *Room) handleDenyWaiting_unlocked(payload any) {
	panic("todo: unimpl")
	// p, ok := payload.(DenyWaitingPayload)
	// if !ok {
	// 	slog.Error("Failed to convert payload to DenyUserPayload")
	// }
	
}

// handleRequestScreenshare_unlocked processes a client's request to start a screenshare.
// It attempts to cast the payload to RequestScreensharePayload and logs an error if the cast fails.
// Broadcasts the request to all hosts for approval.
func (r *Room) handleRequestScreenshare_unlocked(client *Client, payload any) {
	p, ok := payload.(RequestScreensharePayload)
	if !ok {
		slog.Error("Failed to convert payload to RequestScreensharePayload")
		return
	}
	slog.Info("Screenshare requested", "room", r.ID, "userID", client.UserID)
	r.broadcast(MessageType(ClientEventRequestScreenshare), p, HasHostPermission())
}

// todo: unimpl
func (r *Room) handleAcceptScreenshare_unlocked(client *Client, payload any) {
	panic("todo: unimpl")
}


// todo: unimpl
func (r *Room) handleDenyScreenshare_unlocked(client *Client, payload any) {
	panic("todo: unimpl")
}
