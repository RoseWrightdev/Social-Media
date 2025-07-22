package session

import (
	"encoding/json"
	"log/slog"
	"sync"
	"time"
)

// Room now manages the state for a meeting session.
type Room struct {
	ID string // The room ID
	mu sync.RWMutex

	// State Management
	participants map[*Client]bool // Clients who are in the main meeting
	waitingRoom  map[*Client]bool // Clients waiting for admission
	handsRaised  map[*Client]bool // Participants with their hand raised
	hosts        map[*Client]bool // Clients with host privileges
	screenshares map[*Client]bool // Clients currently sharing their screen

	// onEmpty is the callback function to call when the room has no more participants.
	onEmpty func(string)
}

// NewRoom creates and returns a new Room instance with the specified ID and an onEmpty callback.
// The Room is initialized with empty participant, waiting room, hands raised, hosts, and screenshares maps.
// The onEmptyCallback is called when the room becomes empty preventing a memory leak!
//
// Parameters:
//   id - the unique identifier for the room.
//   onEmptyCallback - a function to be called when the room becomes empty.
//
// Returns:
//   A pointer to the newly created Room.
func NewRoom(id string, onEmptyCallback func(string)) *Room {
	return &Room{
		ID:           id,
		participants: make(map[*Client]bool),
		waitingRoom:  make(map[*Client]bool),
		handsRaised:  make(map[*Client]bool),
		hosts:        make(map[*Client]bool),
		screenshares: make(map[*Client]bool),
		onEmpty:      onEmptyCallback,
	}
}

// handleClientJoined manages the logic for when a client joins the room.
// If the room has no participants or hosts, the first client becomes the host and is admitted immediately.
// Otherwise, the client is placed in the waiting room and hosts are notified of the waiting user.
func (r *Room) handleClientJoined(client *Client) {
	r.mu.Lock()
	defer r.mu.Unlock()

	// First user to join becomes the host.
	if len(r.participants) == 0 && len(r.hosts) == 0 {
		slog.Info("First user joined, making them host.", "room", r.ID, "userID", client.UserID)
		client.Role = RoleTypeHost
		r.hosts[client] = true
		r.admitClient_unlocked(client)
		return
	}

	slog.Info("User joined waiting room.", "room", r.ID, "userID", client.UserID)
	client.Role = RoleTypeWaiting
	r.waitingRoom[client] = true
	r.notifyHostsOfWaitingUser_unlocked(client)
}

// handleClientLeft manages cleanup when a client disconnects.
// handleClientLeft removes the specified client from all room-related states,
// including participants, waiting room, hands raised, screenshares, and hosts.
// It logs the disconnection event. If the client was a participant and the room
// becomes empty as a result, it triggers the onEmpty callback in a separate goroutine.
// Otherwise, it broadcasts the updated room state to remaining clients.
func (r *Room) handleClientLeft(client *Client) {
	r.mu.Lock()
	defer r.mu.Unlock()

	wasParticipant := r.participants[client]

	// Remove from all possible states
	delete(r.waitingRoom, client)
	delete(r.participants, client)
	delete(r.handsRaised, client)
	delete(r.screenshares, client)
	delete(r.hosts, client)

	slog.Info("Client disconnected and removed from room", "room", r.ID, "userID", client.UserID)

	if wasParticipant {
		// If the room is empty of participants, trigger the callback.
		if len(r.participants) == 0 {
			if r.onEmpty != nil {
				go r.onEmpty(r.ID) // Run in a goroutine to avoid potential deadlocks
			}
		} else {
			r.broadcastRoomState_unlocked()
		}
	}
	
}

// handleMessage is the central router for all incoming messages from clients.
// handleMessage processes an incoming message from a client within the room.
// It acquires a lock to ensure thread safety and determines the client's role
// (participant or host) before dispatching the message to the appropriate handler
// based on its type. Supported message types include chat, raise hand, and admit user.
// Unknown message types are logged as warnings.
func (r *Room) handleMessage(client *Client, msg Message) {
	// Acquire lock once at the top level. This prevents deadlocks and races.
	r.mu.Lock()
	defer r.mu.Unlock()

	isParticipant := r.participants[client]
	isHost := r.hosts[client]

	switch msg.Type {
	case MessageTypeChat:
		if isParticipant {
			r.handleChatMessage_unlocked(client, msg.Payload)
		}
	case MessageTypeRaiseHand:
		if isParticipant {
			r.handleRaiseHand_unlocked(client, msg.Payload)
		}
	case MessageTypeAdmitUser:
		if isHost {
			r.handleAdmitUser_unlocked(msg.Payload)
		}
	default:
		slog.Warn("Received unknown message type", "type", msg.Type)
	}
}

// --- Specific Action Handlers (all are now _unlocked) ---

// handleChatMessage_unlocked processes an incoming chat message from a sender client.
// It unmarshals the payload into a ChatPayload, sets the sender's user ID and the current timestamp,
// and broadcasts the chat message to all participants in the room.
// This method assumes the caller has already acquired the necessary locks for thread safety.
func (r *Room) handleChatMessage_unlocked(sender *Client, payload any) {
	var p ChatPayload
	if err := UnmarshalPayload(payload, &p); err != nil {
		slog.Error("Failed to unmarshal ChatPayload", "error", err)
		return
	}
	p.SenderID = sender.UserID
	p.Timestamp = time.Now().Unix()

	r.broadcastToParticipants_unlocked(MessageTypeChat, p)
}

// handleRaiseHand_unlocked processes a client's request to raise or lower their hand in the room.
// It unmarshals the payload into a RaiseHandPayload, updates the handsRaised map accordingly,
// logs the change, and broadcasts the updated room state to all clients.
// This method assumes the caller holds the necessary room lock.
func (r *Room) handleRaiseHand_unlocked(client *Client, payload any) {
	var p RaiseHandPayload
	if err := UnmarshalPayload(payload, &p); err != nil {
		slog.Error("Failed to unmarshal RaiseHandPayload", "error", err)
		return
	}

	if p.IsRaised {
		r.handsRaised[client] = true
	} else {
		delete(r.handsRaised, client)
	}
	slog.Info("Hand state changed", "room", r.ID, "userID", client.UserID, "raised", p.IsRaised)
	r.broadcastRoomState_unlocked()
}

// handleAdmitUser_unlocked processes a request to admit a user from the waiting room.
// It unmarshals the payload into an AdmitUserPayload, searches for the target user in the waiting room,
// removes them if found, and admits them to the room. Logs errors and admission events.
// This method must be called with the Room's lock already held.
func (r *Room) handleAdmitUser_unlocked(payload any) {
	var p AdmitUserPayload
	if err := UnmarshalPayload(payload, &p); err != nil {
		slog.Error("Failed to unmarshal AdmitUserPayload", "error", err)
		return
	}

	for waitingClient := range r.waitingRoom {
		if waitingClient.UserID == p.TargetUserID {
			delete(r.waitingRoom, waitingClient)
			r.admitClient_unlocked(waitingClient)
			slog.Info("User admitted from waiting room", "room", r.ID, "userID", waitingClient.UserID)
			return
		}
	}
}

// --- Helper and Broadcast Methods ---

// admitClient_unlocked adds the given client to the room's participants list and sets their role to participant.
// It then broadcasts the updated room state to all clients.
// This method is not thread-safe and should only be called when the room's lock is already held.
func (r *Room) admitClient_unlocked(client *Client) {
	client.Role = RoleTypeParticipant
	r.participants[client] = true
	r.broadcastRoomState_unlocked()
}

// broadcastToParticipants_unlocked sends a message of the specified type and payload to all participants in the room.
// The message is marshaled to JSON before being sent. If marshaling fails, an error is logged and the broadcast is aborted.
// Each participant receives the message via their send channel; if a participant's channel is blocked, the message is skipped for that participant to prevent blocking the broadcast.
func (r *Room) broadcastToParticipants_unlocked(msgType MessageType, payload any) {
	msg := Message{Type: msgType, Payload: payload}
	rawMsg, err := json.Marshal(msg)
	if err != nil {
		slog.Error("Failed to marshal broadcast message", "type", msgType, "error", err)
		return
	}

	for p := range r.participants {
		select {
		case p.send <- rawMsg:
		default:
			// This case prevents a slow client from blocking the whole broadcast.
		}
	}
}

// broadcastRoomState_unlocked constructs the current state of the room, including the list of participants and those with raised hands,
// and broadcasts this state to all participants in the room. This method assumes the caller holds the necessary locks for thread safety.
func (r *Room) broadcastRoomState_unlocked() {
	participants := make(map[string]string)
	for p := range r.participants {
		participants[p.UserID] = p.UserID
	}

	handsRaised := make([]string, 0, len(r.handsRaised))
	for c := range r.handsRaised {
		handsRaised = append(handsRaised, c.UserID)
	}

	payload := RoomStatePayload{
		RoomID:       r.ID,
		Participants: participants,
		HandsRaised:  handsRaised,
	}

	r.broadcastToParticipants_unlocked(EventTypeRoomState, payload)
}

// notifyHostsOfWaitingUser_unlocked notifies all hosts in the room about a user waiting for admission.
// It constructs an admission request message for the specified waiting client and sends it to each host's
// send channel. If the message cannot be marshaled to JSON, an error is logged and no notifications are sent.
// This method assumes the caller holds the necessary room lock.
func (r *Room) notifyHostsOfWaitingUser_unlocked(waitingClient *Client) {
	payload := AdmissionRequestPayload{
		UserID:      waitingClient.UserID,
		DisplayName: waitingClient.UserID, // Use a real display name here
	}
	msg := Message{Type: EventTypeAdmissionRequest, Payload: payload}
	rawMsg, err := json.Marshal(msg)
	if err != nil {
		slog.Error("Failed to marshal admission request", "error", err)
		return
	}

	for host := range r.hosts {
		select {
		case host.send <- rawMsg:
		default:
		}
	}
}

// UnmarshalPayload marshals the given payload to JSON and then unmarshals it into the target.
// This function is useful for converting between types by serializing and deserializing via JSON.
// It returns an error if marshaling or unmarshaling fails.
//
// Parameters:
//   - payload: The input data to be marshaled to JSON.
//   - target: A pointer to the variable where the unmarshaled data will be stored.
//
// Returns:
//   - error: An error if marshaling or unmarshaling fails, otherwise nil.
func UnmarshalPayload(payload any, target any) error {
	rawPayload, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	return json.Unmarshal(rawPayload, target)
}
