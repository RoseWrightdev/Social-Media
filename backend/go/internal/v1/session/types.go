package session

// RoleType describes the type of client.
type RoleType string

// UserIdType represents the UserID
type UserIDType string

// DisplayNameType represents the display name
type DisplayNameType string

// This enum is the single source of truth for a client's role.
const (
	RoleTypeWaiting     RoleType = "waiting"
	RoleTypeParticipant RoleType = "participant"
	RoleTypeScreenshare RoleType = "screenshare"
	RoleTypeHost        RoleType = "host"
)

// MessageType defines the type of a WebSocket message.
type MessageType string

// Event represents a specific type of message event in the session context.
// It is defined as an alias for MessageType.
type Event MessageType

const (
	EventAddChat            Event = "add_chat"
	EventDeleteChat         Event = "delete_chat"
	EventRecentsChat		Event = "recents_chat"
	EventRaiseHand          Event = "raise_hand"
	EventLowerHand          Event = "lower_hand"
	EventRequestWaiting     Event = "waiting_request"
	EventConnect            Event = "connect"
	EventDisconnect         Event = "disconnect"
	EventAcceptWaiting      Event = "accept_waiting"
	EventDenyWaiting        Event = "deny_waiting"
	EventRequestScreenshare Event = "request_screenshare"
	EventAcceptScreenshare  Event = "accept_screenshare"
	EventDenyScreenshare    Event = "deny_screenshare"
)

// Message is the structure for all incoming and outgoing WebSocket messages.
type Message struct {
	Type    MessageType `json:"type"`
	Payload any         `json:"payload"`
}

// --- Payload Types ---

type RaiseHandPayload struct {
	ClientInfo
	IsRaised bool `json:"isRaised"`
}

// AcceptWaitingPayload is an alias for ClientInfo, representing the payload structure.
type AcceptWaitingPayload = ClientInfo

type DenyWaitingPayload = ClientInfo

// ClientInfo holds public information about a user in the room.
type ClientInfo struct {
	UserID      UserIDType 		`json:"userId"`
	DisplayName DisplayNameType `json:"displayName"`
}
// ClientDisconnectPayload is an alias for ClientInfo, representing the payload structure.
type ClientDisconnectPayload = ClientInfo


// RoomStatePayload contains the full state of a room.
type RoomStatePayload struct {
	ClientInfo
	RoomID         RoomIDType   `json:"roomId"`
	Hosts		   []ClientInfo `json:"hosts"`
	Participants   []ClientInfo `json:"participants"`
	HandsRaised    []ClientInfo `json:"handsRaised"`
	WaitingUsers   []ClientInfo `json:"waitingUsers"`
	ScreensharerID []ClientInfo `json:"screensharerId,omitempty"`
}

// RequestWaitingPayload is an alias for ClientInfo, representing the payload structure.
type RequestWaitingPayload = ClientInfo

// AccceptWaitingPayload is an alias for ClientInfo, representing the payload structure.
type AccceptWaitingPayload = ClientInfo

// ParticipantJoinedPayload is an alias for ClientInfo, representing the payload structure.
type ParticipantJoinedPayload = ClientInfo

// ParticipantLeftPayload is an alias for ClientInfo, representing the payload structure.
type ParticipantLeftPayload = ClientInfo

// HandPayload is an alias for ClientInfo, representing the payload structure.
type HandPayload struct {
	ClientInfo
	IsRaised bool `json:"isRaised"`
}

type ChatMessagePayload struct {
	ClientInfo
	Content    string `json:"content"`
	Timestamp  int64  `json:"timestamp"`
}

// RequestScreensharePayload is an alias for ClientInfo, representing the payload structure.
type RequestScreensharePayload = ClientInfo

// AcceptScreensharePayload is an alias for ClientInfo, representing the payload structure.
type AcceptScreensharePayload = ClientInfo

// DenyScreensharePayload is an alias for ClientInfo, representing the payload structure.
type DenyScreensharePayload = ClientInfo
