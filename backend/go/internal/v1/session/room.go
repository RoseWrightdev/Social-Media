package session

import (
	"container/list"
	"encoding/json"
	"log/slog"
	"sync"

	"k8s.io/utils/set"
)

// Room now manages the state for a meeting session.
type Room struct {
	// --- global state ---

	ID                   RoomIdType   // The room ID
	mu                   sync.RWMutex // conn sync
	chatHistory          *list.List   // The chat history
	maxChatHistoryLength int          // Max length

	// --- Permission State Management ---

	hosts        map[ClientIdType]*Client // Clients with host privileges
	participants map[ClientIdType]*Client // Clients who are in the main meeting
	waiting      map[ClientIdType]*Client // Clients waiting for admission

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

	raisingHand   map[ClientIdType]*Client // Participants with their hand raised
	sharingScreen map[ClientIdType]*Client // Participants currently sharing their screen
	unmuted       map[ClientIdType]*Client // Participants currently unmuted
	cameraOn      map[ClientIdType]*Client // Perticipants currented with their camera on

	// onEmpty is the callback function to call when the room has no more participants.
	onEmpty func(RoomIdType)
}

// handleClientJoined manages the logic for when a client joins the room.
// If the room has no participants or hosts, the first client becomes the host and is admitted immediately.
// Otherwise, the client is placed in the waiting room and hosts are notified.
func (r *Room) handleClientConnect(client *Client) {
	r.mu.Lock()
	defer r.mu.Unlock()

	// First user to join becomes the host.
	if len(r.participants) == 0 && len(r.hosts) == 0 {
		slog.Info("First user joined, making them host.", "room", r.ID, "ClientId", client.ID)
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
	slog.Info("Client disconnected and removed from room", "room", r.ID, "ClientId", client.ID)

	payload := ClientDisconnectPayload{
		ClientId:    client.ID,
		DisplayName: client.DisplayName,
	}

	// Broadcast to remaining clients
	r.broadcast(Event(EventDisconnect), payload, nil)

	// Check if room is empty AFTER broadcasting
	if r.isRoomEmpty() {
		if r.onEmpty == nil {
			slog.Error("onEmpty callback not defined. This will cause a memory leak.", "RoomId", r.ID)
			return
		}
		// Run in a goroutine to avoid potential deadlocks
		go func() {
			defer func() {
				if recover() != nil {
					slog.Error("Panic in onEmpty callback", "RoomId", r.ID)
				}
			}()
			r.onEmpty(r.ID)
		}()
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
func NewRoom(id RoomIdType, onEmptyCallback func(RoomIdType)) *Room {
	return &Room{
		ID:                   id,
		chatHistory:          list.New(),
		maxChatHistoryLength: 100, // Default to 100 messages

		hosts:        make(map[ClientIdType]*Client),
		participants: make(map[ClientIdType]*Client),
		waiting:      make(map[ClientIdType]*Client),

		waitingDrawOrderStack: list.New(),
		clientDrawOrderQueue:  list.New(),
		handDrawOrderQueue:    list.New(),

		raisingHand:   make(map[ClientIdType]*Client),
		sharingScreen: make(map[ClientIdType]*Client),
		unmuted:       make(map[ClientIdType]*Client),
		cameraOn:      make(map[ClientIdType]*Client),

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
		slog.Error("router failed to marshal incoming message to type Message", "msg", msg, "id", client.ID)
		return
	}

	role := client.Role
	isHost := HasPermission(role, HasHostPermission())
	isParticipant := HasPermission(role, HasParticipantPermission())
	isWaiting := HasPermission(role, HasWaitingPermission())

	switch msg.Event {
	case EventAddChat:
		if isParticipant {
			r.handleAddChat(client, msg.Event, msg.Payload)
		}

	case EventDeleteChat:
		if isParticipant {
			r.handleDeleteChat(client, msg.Event, msg.Payload)
		}

	case EventGetRecentChats:
		if isParticipant {
			r.handleGetRecentChats(client, msg.Event, msg.Payload)
		}

	case EventRaiseHand:
		if isParticipant {
			r.handleRaiseHand(client, msg.Event, msg.Payload)
		}
	case EventLowerHand:
		if isParticipant {
			r.handleLowerHand(client, msg.Event, msg.Payload)
		}

	case EventRequestWaiting:
		if isWaiting {
			r.handleRequestWaiting(client, msg.Event, msg.Payload)
		}

	case EventAcceptWaiting:
		if isHost {
			r.handleAcceptWaiting(client, msg.Event, msg.Payload)
		}

	case EventDenyWaiting:
		if isHost {
			r.handleDenyWaiting(client, msg.Event, msg.Payload)
		}

	case EventRequestScreenshare:
		if (role != RoleTypeScreenshare) &&
			isParticipant {
			r.handleRequestScreenshare(client, msg.Event, msg.Payload)
		}

	case EventAcceptScreenshare:
		if isHost {
			r.handleAcceptScreenshare(client, msg.Event, msg.Payload)
		}

	case EventDenyScreenshare:
		if isHost {
			r.handleDenyScreenshare(client, msg.Event, msg.Payload)
		}

	default:
		slog.Warn("Received unknown message event", "event", msg.Event)
	}
}

// broadcast sends a message of the specified event and payload to clients in the room.
// This method assumes the caller already holds the appropriate lock.
func (r *Room) broadcast(event Event, payload any, roles set.Set[RoleType]) {
	msg := Message{Event: event, Payload: payload}
	rawMsg, err := json.Marshal(msg)
	if err != nil {
		slog.Error("Failed to marshal broadcast message", "payload", payload, "error", err)
		return
	}

	if roles == nil {
		// Send to all roles
		for _, m := range []map[ClientIdType]*Client{r.hosts, r.sharingScreen, r.participants, r.waiting} {
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

// clientsMapToSlice converts a map of ClientIdType to *Client into a slice of *Client.
// It iterates over the map and appends each client pointer to a new slice, which is then returned.
// The order of clients in the resulting slice is not guaranteed.
func clientsMapToSlice(m map[ClientIdType]*Client) []*Client {
	clients := make([]*Client, 0, len(m))
	for _, c := range m {
		clients = append(clients, c)
	}
	return clients
}

// getRoomState returns the current state of the room including all participants, hosts, etc.
// This method is thread-safe and can be called concurrently.
func (r *Room) getRoomState() RoomStatePayload {
	r.mu.RLock()
	defer r.mu.RUnlock()

	// Convert client maps to slices of ClientInfo
	hosts := make([]ClientInfo, 0, len(r.hosts))
	for _, client := range r.hosts {
		hosts = append(hosts, ClientInfo{
			ClientId:    client.ID,
			DisplayName: client.DisplayName,
		})
	}

	participants := make([]ClientInfo, 0, len(r.participants))
	for _, client := range r.participants {
		participants = append(participants, ClientInfo{
			ClientId:    client.ID,
			DisplayName: client.DisplayName,
		})
	}

	waitingUsers := make([]ClientInfo, 0, len(r.waiting))
	for _, client := range r.waiting {
		waitingUsers = append(waitingUsers, ClientInfo{
			ClientId:    client.ID,
			DisplayName: client.DisplayName,
		})
	}

	handsRaised := make([]ClientInfo, 0, len(r.raisingHand))
	for _, client := range r.raisingHand {
		handsRaised = append(handsRaised, ClientInfo{
			ClientId:    client.ID,
			DisplayName: client.DisplayName,
		})
	}

	sharingScreen := make([]ClientInfo, 0, len(r.sharingScreen))
	for _, client := range r.sharingScreen {
		sharingScreen = append(sharingScreen, ClientInfo{
			ClientId:    client.ID,
			DisplayName: client.DisplayName,
		})
	}

	return RoomStatePayload{
		ClientInfo:    ClientInfo{}, // This will be set by the caller if needed
		RoomID:        r.ID,
		Hosts:         hosts,
		Participants:  participants,
		HandsRaised:   handsRaised,
		WaitingUsers:  waitingUsers,
		SharingScreen: sharingScreen,
	}
}
