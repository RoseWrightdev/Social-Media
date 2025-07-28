package session

import (
	"container/list"
	"encoding/json"
	"log/slog"
	"sync"

	"k8s.io/utils/set"
)

// RoomIDType represents the uquie id for the room.
type RoomIDType string

// Room now manages the state for a meeting session.
type Room struct {
	// --- global state ---

	ID                   RoomIDType   // The room ID
	mu                   sync.RWMutex // conn sync
	chatHistory          *list.List   // The chat history
	maxChatHistoryLength int          // Max length

	// --- Permission State Management ---

	hosts        map[UserIDType]*Client // Clients with host privileges
	participants map[UserIDType]*Client // Clients who are in the main meeting
	waiting      map[UserIDType]*Client // Clients waiting for admission

	// --- Draw Orders ---

	// The draw is a list implementation of a stack.
	// Each time a new client enters the waiting room push to the top of the stack.
	// anytime a host admits a Client pop that from the n pos at the stack to the top of the stack.
	waitingDrawOrderStack *list.List

	// The draw is a list implementation of a queue.
	// As participants join they are added to the back of the queue.
	// As particpants speak they are popped to the front of the queue.
	// When clients leave they are removed from the queue at their current position.
	clientDrawOrderQueue *list.List // stores *Client elements
	// As new clients raise their hands add to back of the queue
	handDrawOrderQueue *list.List // stores *Client elements

	// --- Client State management ---

	raisingHand   map[UserIDType]*Client // Participants with their hand raised
	sharingScreen map[UserIDType]*Client // Participants currently sharing their screen
	unmuted       map[UserIDType]*Client // Participants currently unmuted
	cameraOn      map[UserIDType]*Client // Perticipants currented with their camera on

	// onEmpty is the callback function to call when the room has no more participants.
	onEmpty func(RoomIDType)
}

// handleClientJoined manages the logic for when a client joins the room.
// If the room has no participants or hosts, the first client becomes the host and is admitted immediately.
// Otherwise, the client is placed in the waiting room and hosts are notified.
func (r *Room) handleClientConnect(client *Client) {
	r.mu.Lock()
	defer r.mu.Unlock()

	// First user to join becomes the host.
	if len(r.participants) == 0 && len(r.hosts) == 0 {
		slog.Info("First user joined, making them host.", "room", r.ID, "userID", client.UserID)
		r.addHost(client)
		return
	}
	r.addWaiting(client)
}

// handleClientLeft manages cleanup when a client disconnects.
// It removes the client from all room-related states.
// If the client was the last participant, it triggers the onEmpty callback to clean up the room itself.
// Otherwise, it broadcasts the updated room state to remaining clients.
func (r *Room) handleClientDisconnect(client *Client) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.disconnectClient(client)
	slog.Info("Client disconnected and removed from room", "room", r.ID, "userID", client.UserID)

	payload := ClientDisconnectPayload{
		UserID:      client.UserID,
		DisplayName: client.DisplayName,
	}

	// Broadcast to remaining clients
	r.broadcast(MessageType(EventDisconnect), payload, nil)

	// Check if room is empty AFTER broadcasting
	if r.isRoomEmpty() {
		if r.onEmpty == nil {
			panic("onEmpty callback not defined. This will cause a memory leak.")
		}
		// Run in a goroutine to avoid potential deadlocks
		go r.onEmpty(r.ID)
	}
}

// NewRoom creates and returns a new Room instance with the specified ID and an onEmpty callback.
// The Room is initialized with empty participant, waiting room, hands raised, hosts, and sharingScreen maps.
// The onEmptyCallback is called when the room becomes empty, preventing a memory leak.
//
// Parameters:
//   - id: the unique identifier for the room.
//   - onEmptyCallback: a function to be called when the room becomes empty.
//
// Returns:
//   - A pointer to the newly created Room.
func NewRoom(id RoomIDType, onEmptyCallback func(RoomIDType)) *Room {
	return &Room{
		ID: id,

		hosts:        make(map[UserIDType]*Client),
		participants: make(map[UserIDType]*Client),
		waiting:      make(map[UserIDType]*Client),

		waitingDrawOrderStack: list.New(),
		clientDrawOrderQueue:  list.New(),
		handDrawOrderQueue:    list.New(),

		raisingHand:   make(map[UserIDType]*Client),
		sharingScreen: make(map[UserIDType]*Client),
		unmuted:       make(map[UserIDType]*Client),
		cameraOn:      make(map[UserIDType]*Client),

		onEmpty: onEmptyCallback,
	}
}

// router is the central router for all incoming messages from clients.
// router calls the speficied handler for the given type if the client
// has the required permissions.
//
// It acquires a lock to ensure thread safety.
func (r *Room) router(client *Client, data any) {
	r.mu.Lock()
	defer r.mu.Unlock()

	msg, ok := data.(Message)
	if !ok {
		slog.Error("router failed to marshal incoming message to type Message", "msg", msg, "id", client.UserID)
		return
	}

	role := client.Role

	switch msg.Type {
	case MessageType(EventAddChat):
		if HasPermission(role, HasParticipantPermission()) {
			r.handleAddChat(client, msg.Payload)
		}

	case MessageType(EventDeleteChat):
		if HasPermission(role, HasParticipantPermission()) {
			r.handleDeleteChat(client, msg.Payload)
		}

	case MessageType(EventRecentsChat):
		if HasPermission(role, HasParticipantPermission()) {
			r.handleRecentsChat(client, msg.Payload)
		}

	case MessageType(EventRaiseHand):
		if HasPermission(role, HasParticipantPermission()) {
			r.handleRaiseHand(client, msg.Payload)
		}
	case MessageType(EventLowerHand):
		if HasPermission(role, HasParticipantPermission()) {
			r.handleLowerHand(client, msg.Payload)
		}

	case MessageType(EventRequestWaiting):
		if HasPermission(role, HasWaitingPermission()) {
			r.handleRequestWaiting(client, msg.Payload)
		}

	case MessageType(EventAcceptWaiting):
		if HasPermission(role, HasHostPermission()) {
			r.handleAcceptWaiting(msg.Payload)
		}

	case MessageType(EventDenyWaiting):
		if HasPermission(role, HasHostPermission()) {
			r.handleDenyWaiting(msg.Payload)
		}

	case MessageType(EventRequestScreenshare):
		if (client.Role != RoleTypeScreenshare) &&
			HasPermission(role, HasParticipantPermission()) {
			r.handleRequestScreenshare(client, msg.Payload)
		}

	case MessageType(EventAcceptScreenshare):
		if HasPermission(role, HasHostPermission()) {
			r.handleAcceptScreenshare(client, msg.Payload)
		}

	case MessageType(EventDenyScreenshare):
		if HasPermission(role, HasHostPermission()) {
			r.handleDenyScreenshare(client, msg.Payload)
		}

	default:
		slog.Warn("Received unknown message type", "type", msg.Type)
	}
}

// broadcast sends a message of the specified MsgType and payload to clients in the room.
//
// If a client's send channel is full, the message is dropped for that client to prevent blocking.
// Any errors during marshaling are logged, and the broadcast is aborted.
// broadcast sends a message of the specified type and payload to clients in the room.
// The message can be broadcast to all clients or restricted to specific roles.
//
// If no roles are provided, the message is sent to all clients in the room, including hosts,
// screen sharers, participants, and waiting users. If one or more roles are specified, the
// message is sent only to clients matching those roles.
//
// The function marshals the message to JSON and sends it to each client's send channel.
// To prevent a slow client from blocking the broadcast, the send operation is non-blocking.
//
// Params:
//   - MsgType: The type of the message to broadcast (MessageType).
//   - payload: The payload of the message (any type).
//   - roles:   Optional list of RoleType values. If provided, only clients with these roles
//     will receive the message. If omitted, all clients receive the message.
//
// Example usage:
//
//	r.broadcast(MessageTypeChat, chatPayload) // Broadcast to all clients
//	r.broadcast(MessageTypeUpdate, updatePayload, RoleTypeHost, RoleTypeParticipant) // Broadcast to hosts and participants
func (r *Room) broadcast(MsgType MessageType, payload any, roles set.Set[RoleType]) {
	msg := Message{Type: MsgType, Payload: payload}
	rawMsg, err := json.Marshal(msg)
	if err != nil {
		slog.Error("Failed to marshal broadcast message", "payload", payload, "error", err)
		return
	}

	if roles == nil {
		// Send to all roles
		for _, m := range []map[UserIDType]*Client{r.hosts, r.sharingScreen, r.participants, r.waiting} {
			for _, p := range m {
				select {
				case p.send <- rawMsg:
				default:
					// Prevent a slow client from blocking the whole broadcast.
				}
			}
		}

	} else {
		for role := range roles {
			var clients []*Client
			switch role {
			case RoleTypeHost:
				clients = clientsMapToSlice(r.hosts)
			case RoleTypeScreenshare:
				clients = clientsMapToSlice(r.sharingScreen)
			case RoleTypeParticipant:
				clients = clientsMapToSlice(r.participants)
			case RoleTypeWaiting:
				clients = clientsMapToSlice(r.waiting)
			default:
				continue
			}
			for _, p := range clients {
				select {
				case p.send <- rawMsg:
				default:
					// Prevent a slow client from blocking the whole broadcast.
				}
			}
		}
	}
}

// clientsMapToSlice converts a map of UserIDType to *Client into a slice of *Client.
// It iterates over the map and appends each client pointer to a new slice, which is then returned.
// The order of clients in the resulting slice is not guaranteed.
func clientsMapToSlice(m map[UserIDType]*Client) []*Client {
	clients := make([]*Client, 0, len(m))
	for _, c := range m {
		clients = append(clients, c)
	}
	return clients
}

// todo: unimpl
func (r *Room) getRoomState() {
	panic("unimpl")
}
