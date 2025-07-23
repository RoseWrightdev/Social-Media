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
	participants map[string]*Client // Clients who are in the main meeting
	waitingRoom  map[string]*Client // Clients waiting for admission
	handsRaised  map[string]*Client // Participants with their hand raised
	hosts        map[string]*Client // Clients with host privileges
	screenshares map[string]*Client // Clients currently sharing their screen

	// onEmpty is the callback function to call when the room has no more participants.
	onEmpty func(string)
}

// NewRoom creates and returns a new Room instance with the specified ID and an onEmpty callback.
// The Room is initialized with empty participant, waiting room, hands raised, hosts, and screenshares maps.
// The onEmptyCallback is called when the room becomes empty, preventing a memory leak.
//
// Parameters:
//   - id: the unique identifier for the room.
//   - onEmptyCallback: a function to be called when the room becomes empty.
//
// Returns:
//   - A pointer to the newly created Room.
func NewRoom(id string, onEmptyCallback func(string)) *Room {
	return &Room{
		ID:           id,
		participants: make(map[string]*Client),
		waitingRoom:  make(map[string]*Client),
		handsRaised:  make(map[string]*Client),
		hosts:        make(map[string]*Client),
		screenshares: make(map[string]*Client),
		onEmpty:      onEmptyCallback,
	}
}

// handleClientJoined manages the logic for when a client joins the room.
// If the room has no participants or hosts, the first client becomes the host and is admitted immediately.
// Otherwise, the client is placed in the waiting room and hosts are notified.
func (r *Room) handleClientJoined(client *Client) {
	r.mu.Lock()
	defer r.mu.Unlock()

	// First user to join becomes the host.
	if len(r.participants) == 0 && len(r.hosts) == 0 {
		slog.Info("First user joined, making them host.", "room", r.ID, "userID", client.UserID)
		client.Role = RoleTypeHost
		r.hosts[client.UserID] = client
		r.admitClient_unlocked(client)
		return
	}

	slog.Info("User joined waiting room.", "room", r.ID, "userID", client.UserID)
	client.Role = RoleTypeWaiting
	r.waitingRoom[client.UserID] = client
	r.notifyHostsOfWaitingUser_unlocked(client)
}

// handleClientLeft manages cleanup when a client disconnects.
// It removes the client from all room-related states.
// If the client was the last participant, it triggers the onEmpty callback to clean up the room itself.
// Otherwise, it broadcasts the updated room state to remaining clients.
func (r *Room) handleClientLeft(client *Client) {
	r.mu.Lock()
	defer r.mu.Unlock()


	// Remove from all possible states
	delete(r.waitingRoom, client.UserID)
	delete(r.participants, client.UserID)
	delete(r.handsRaised, client.UserID)
	delete(r.screenshares, client.UserID)
	delete(r.hosts, client.UserID)

	slog.Info("Client disconnected and removed from room", "room", r.ID, "userID", client.UserID)

	if 	_, ok := r.participants[client.UserID]; ok{
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
	r.mu.Lock()
	defer r.mu.Unlock()

	_, isParticipant := r.participants[client.UserID]
	_, isHost := r.hosts[client.UserID]

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
		r.handsRaised[client.UserID] = client
	} else {
		delete(r.handsRaised, client.UserID)
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
	if waitingClient, ok := r.waitingRoom[p.TargetUserID]; ok {
		delete(r.waitingRoom, p.TargetUserID)
		r.admitClient_unlocked(waitingClient)
		slog.Info("User admitted from waiting room", "room", r.ID, "userID", ok)
		return
	}
}

// --- Helper and Broadcast Methods ---

// admitClient_unlocked adds the given client to the room's participants list and sets their role to participant.
// It then broadcasts the updated room state to all clients.
// This method is not thread-safe and should only be called when the room's lock is already held.
func (r *Room) admitClient_unlocked(client *Client) {
	client.Role = RoleTypeParticipant
	r.participants[client.UserID] = client
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

	for _, p := range r.participants {
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
	participantsList := make([]ParticipantInfo, 0, len(r.participants))
	for _, p := range r.participants {
		participantsList = append(participantsList, ParticipantInfo{
			UserID:      p.UserID,
			DisplayName: p.DisplayName,
		})
	}

	handsRaisedList := make([]string, 0, len(r.handsRaised))
	for userID := range r.handsRaised {
		handsRaisedList = append(handsRaisedList, userID)
	}

	payload := RoomStatePayload{
		RoomID:       r.ID,
		Participants: participantsList, // Assign the slice
		HandsRaised:  handsRaisedList,
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
		DisplayName: waitingClient.DisplayName,
	}
	msg := Message{Type: EventTypeAdmissionRequest, Payload: payload}
	rawMsg, err := json.Marshal(msg)
	if err != nil {
		slog.Error("Failed to marshal admission request", "error", err)
		return
	}

	for _, host := range r.hosts {
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
