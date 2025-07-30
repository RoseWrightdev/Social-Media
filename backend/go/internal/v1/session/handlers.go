package session

import (
	"encoding/json"
	"log/slog"
)

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

func assertPayload[T any](payload any) (T, bool) {
	p, ok := payload.(T)
	return p, ok
}

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

func (r *Room) handleDeleteChat(client *Client, event Event, payload any) {
	p, ok := assertPayload[DeleteChatPayload](payload)
	logHelper(ok, client.ID, GetFuncName(), r.ID)
	if !ok {
		return
	}
	r.deleteChat(p)
	r.broadcast(event, p, HasParticipantPermission())
}

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
