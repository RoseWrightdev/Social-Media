package session

// MessageType defines the type of a WebSocket message.
type MessageType string

const (
	// --- Client-to-Server Event Types ---
	MessageTypeChat               MessageType = "chat_message"
	MessageTypeRaiseHand          MessageType = "raise_hand"
	MessageTypeRequestAdmission   MessageType = "request_admission"
	MessageTypeAdmitUser          MessageType = "admit_user"
	MessageTypeDenyUser           MessageType = "deny_user"
	MessageTypeRequestScreenshare MessageType = "request_screenshare"
	MessageTypeAcceptScreenshare  MessageType = "accept_screenshare"
	MessageTypeDenyScreenshare    MessageType = "deny_screenshare"

	// --- Server-to-Client Event Types ---
	EventTypeRoomState        MessageType = "room_state"        // The single source of truth for room state.
	EventTypeAdmissionRequest MessageType = "admission_request" // Sent to hosts when a user is waiting.
)

// Message is the structure for all incoming and outgoing WebSocket messages.
type Message struct {
	Type    MessageType `json:"type"`
	Payload any         `json:"payload"`
}

// --- Payload Types ---

// ChatPayload is the payload for "chat_message".
type ChatPayload struct {
	SenderID    string `json:"senderId"`
	DisplayName string `json:"displayName"`
	Content     string `json:"content"`
	Timestamp   int64  `json:"timestamp"`
}

// RaiseHandPayload is the payload for the "raise_hand" message.
type RaiseHandPayload struct {
	IsRaised bool `json:"isRaised"`
}

// AdmitUserPayload is the payload for the "admit_user" message.
type AdmitUserPayload struct {
	TargetUserID string `json:"targetUserId"`
}

// DenyUserPayload is the payload for the "deny_user" message.
type DenyUserPayload struct {
	TargetUserID string `json:"targetUserId"`
	Reason       string `json:"reason,omitempty"`
}

// ParticipantInfo holds public information about a user in the room.
type ParticipantInfo struct {
	UserID      string `json:"userId"`
	DisplayName string `json:"displayName"`
}

// RoomStatePayload contains the full state of a room, sent to clients.
type RoomStatePayload struct {
	RoomID       string            `json:"roomId"`
	Participants []ParticipantInfo `json:"participants"`
	HandsRaised  []string          `json:"handsRaised"` // List of UserIDs with hands raised
}

// AdmissionRequestPayload is the payload for "admission_request", sent to hosts.
type AdmissionRequestPayload struct {
	UserID      string `json:"userId"`
	DisplayName string `json:"displayName"`
}
