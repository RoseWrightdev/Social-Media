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

// NewRoom creates a new, stateful room.
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

// handleClientJoined places a new client in the waiting room or meeting.
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

func (r *Room) admitClient_unlocked(client *Client) {
	client.Role = RoleTypeParticipant
	r.participants[client] = true
	r.broadcastRoomState_unlocked()
}

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

func UnmarshalPayload(payload any, target any) error {
	rawPayload, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	return json.Unmarshal(rawPayload, target)
}
