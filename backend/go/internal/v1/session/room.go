package session

import (
	"container/list"
	"encoding/json"
	"log/slog"
	"sync"

	"k8s.io/utils/set"
)

// Room represents a video conference session and manages all associated state.
// Each room maintains participant lists, chat history, permissions, and real-time
// communication channels. Rooms are created dynamically when the first client connects
// and are cleaned up when the last participant leaves.
//
// Concurrency Design:
// Room uses a read-write mutex (sync.RWMutex) to ensure thread-safe access to all state.
// The locking strategy centralizes mutex acquisition in the router method, with all
// other methods assuming the lock is already held. This prevents deadlocks and
// ensures consistent state updates.
//
// State Management:
// The Room maintains several categories of state:
//   - Role-based maps: hosts, participants, waiting users
//   - Activity states: raising hand, screen sharing, audio/video status
//   - Ordering queues: draw order for UI positioning, hand-raise queue for fairness
//   - Chat history: persistent message storage with configurable limits
//
// Memory Management:
// The room includes automatic cleanup mechanisms:
//   - Chat history limits prevent unbounded growth
//   - Client disconnection removes all references
//   - Empty room detection triggers cleanup callbacks

type Room struct {
	// --- Core Identity and Configuration ---
	ID                   RoomIdType   // Unique identifier for this room
	mu                   sync.RWMutex // Read-write mutex for thread safety
	chatHistory          *list.List   // Chronologically ordered chat messages
	maxChatHistoryLength int          // Maximum number of chat messages to retain

	// --- Role-Based Client Management ---
	// These maps define the permission hierarchy within the room
	hosts        map[ClientIdType]*Client // Clients with administrative privileges
	participants map[ClientIdType]*Client // Active meeting participants
	waiting      map[ClientIdType]*Client // Clients awaiting host approval

	// --- User Interface Draw Order Management ---
	// These data structures control the visual ordering of clients in the UI

	// Waiting room uses LIFO (Last In, First Out) ordering - newest requests appear first
	// This helps hosts notice new join requests immediately
	waitingDrawOrderStack *list.List

	// Main participant view uses queue ordering for consistent positioning
	// Participants are added to the back and can be moved to front when speaking
	clientDrawOrderQueue *list.List // stores *Client elements for main view

	// Hand-raise queue uses FIFO (First In, First Out) for fairness
	// Ensures participants get speaking opportunities in the order they requested
	handDrawOrderQueue *list.List // stores *Client elements for hand-raising order

	// --- Real-Time Activity State ---
	// These maps track current participant activities for UI indicators and permissions
	raisingHand   map[ClientIdType]*Client // Participants requesting to speak
	sharingScreen map[ClientIdType]*Client // Participants currently sharing their screen
	unmuted       map[ClientIdType]*Client // Participants with microphone enabled
	cameraOn      map[ClientIdType]*Client // Participants with camera enabled

	// --- Lifecycle Management ---
	// Callback function invoked when the room becomes empty to trigger cleanup
	onEmpty func(RoomIdType)
}

// handleClientConnect manages the initial connection logic when a client joins the room.
// This method implements the room's admission policy and determines the client's initial role.
//
// Admission Logic:
//   - First client to join an empty room automatically becomes the host
//   - All subsequent clients are placed in the waiting room for host approval
//   - This ensures every room has at least one administrator
//
// Concurrency Safety:
// This method acquires the room's write lock to ensure thread-safe state updates
// during the critical client admission process.
//
// Role Assignment:
// The first client receives immediate host privileges, allowing them to:
//   - Accept or deny future participants
//   - Manage screen sharing permissions
//   - Administrative control over room settings
//
// Waiting Room Behavior:
// Non-host clients are placed in waiting status where they:
//   - Cannot participate in the main meeting
//   - Wait for host approval to join
//   - May be denied access by the host
//
// Parameters:
//   - client: The newly connected client to be processed
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
