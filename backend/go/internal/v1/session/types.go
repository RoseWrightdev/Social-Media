package session

// todo: add file level docs
// todo: add missing & review existing comments


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

type ClientEvent MessageType

type ServerEvent MessageType


const (
	// --- Client-to-Server Event Types ---
	// todo: add missing client Events

	ClientEventChat               ClientEvent = "chat_message"
	ClientEventHand               ClientEvent = "hand"
	ClientEventAdmissionRequest   ClientEvent = "admission_request"

	// Sent by host client 

	ClientEventAcceptWaiting      ClientEvent = "accept_waiting"
	ClientEventDenyUser           ClientEvent = "deny_user"
	ClientEventRequestScreenshare ClientEvent = "request_screenshare"
	ClientEventAcceptScreenshare  ClientEvent = "accept_screenshare"
	ClientEventDenyScreenshare    ClientEvent = "deny_screenshare"
	ClientEventAddHost			  ClientEvent = ""
	ClientEventDenyHost			  ClientEvent = ""

	// --- Server-to-Client Event Types ---

	// todo: change naming convention to "SeverEvent" from "EventType"

	EventTypeRoomState            ServerEvent = "room_state"           // The single source of truth for room state.
	EventTypeJoinedWaiting        ServerEvent = "joined_waiting"
	EventTypeLeftWaiting          ServerEvent = "left_waiting"
	EventTypeParticipantJoined    ServerEvent = "participant_joined"
	EventTypeParticipantLeft      ServerEvent = "participant_left"
	EventTypeHand                 ServerEvent = "hand_state_changed"
	EventTypeAcceptScreenshare    ServerEvent = "accept_screenshare"
	EventTypeDenyScreenshare      ServerEvent = "deny_screenshare"
)

// Message is the structure for all incoming and outgoing WebSocket messages.
type Message struct {
	Type    MessageType `json:"type"`
	Payload any         `json:"payload"`
}

// --- Payload Types ---
// todo: add missing payload types
// todo: add missing comments, review existing


// RaiseHandPayload is the payload for the "raise_hand" message.
type RaiseHandPayload struct {
	IsRaised bool `json:"isRaised"`
}

// AcceptWaitingPayload is the payload for the "accept_waiting" message.
type AcceptWaitingPayload struct {
	TargetUserID UserIDType `json:"targetUserId"`
}

// DenyUserPayload is the payload for the "deny_user" message.
type DenyWaitingPayload struct {
	TargetUserID UserIDType `json:"targetUserId"`
	Reason       string 	`json:"reason,omitempty"`
}

// ParticipantInfo holds public information about a user in the room.
type ParticipantInfo struct {
	UserID      UserIDType 		`json:"userId"`
	DisplayName DisplayNameType `json:"displayName"`
}

// RoomStatePayload contains the full state of a room, sent to clients.
type RoomStatePayload struct {
	RoomID         RoomIDType        `json:"roomId"`
	Hosts		   []ParticipantInfo `json:"hosts"`
	Participants   []ParticipantInfo `json:"participants"`
	HandsRaised    []ParticipantInfo `json:"handsRaised"`
	WaitingUsers   []ParticipantInfo `json:"waitingUsers"`
	ScreensharerID []ParticipantInfo `json:"screensharerId,omitempty"`
}

// RequestWaitingPayload is the payload for "admission_request", sent to hosts.
type RequestWaitingPayload struct {
	UserID 		 UserIDType 	 `json:"userId"`
	DisplayName  DisplayNameType `json:"displayName"`
}

type AccceptWaitingPayload struct {
	TargetUserID UserIDType `json:"userId"`
}

// ParticipantJoinedPayload is the payload for "participant_joined".
type ParticipantJoinedPayload struct {
	Participant ParticipantInfo `json:"participant"`
}

// ParticipantLeftPayload is the payload for "participant_left".
type ParticipantLeftPayload struct {
	UserID UserIDType `json:"userId"`
}

// HandPayload is the payload for "hand_state_changed".
type HandPayload struct {
	UserID   UserIDType `json:"userId"`
	IsRaised bool       `json:"isRaised"`
}

type ChatMessagePayload struct {
	UserID      UserIDType      `json:"userId"`
	DisplayName DisplayNameType `json:"displayName"`
	Content     string          `json:"content"`
	SenderID    UserIDType      `json:"senderId"`
	Timestamp   int64           `json:"timestamp"`
}

type RequestScreensharePayload struct {
	UserID      UserIDType      `json:"userId"`
	DisplayName DisplayNameType `json:"displayName"`
}

type AcceptScreensharePayload struct {
	TargetUserID UserIDType `json:"userId"`
}

type DenyScreensharePayload struct {
	UserID UserIDType `json:"userId"`
	Reason string     `json:"reason,omitempty"`
}
