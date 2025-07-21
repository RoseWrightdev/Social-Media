package session

// MessageType defines the type of a WebSocket message.
type MessageType string

const (
	// --- Client-to-Server Event Types
	// MessageTypeChat is for standard text chat messages.
	MessageTypeChat MessageType = "chat_message"
	// MessageTypeRaiseHand is for a user raising or lowering their hand.
	MessageTypeRaiseHand MessageType = "raise_hand"
	// MessageTypeRequestAdmission is sent by a user to ask for entry from the waiting room.
	MessageTypeRequestAdmission MessageType = "request_admission"
	// MessageTypeAdmitUser is sent by a host to admit a user from the waiting room.
	MessageTypeAdmitUser MessageType = "admit_user"
	// MessageTypeDenyUser is sent by a host to deny entry to a user.
	MessageTypeDenyUser MessageType = "deny_user"
	// MessageTypeRequestScreenshare is sent by a user asking to screenshare.
	MessageTypeRequestScreenshare MessageType = "request_screenshare"
	// MessageTypeAcceeptScreenshare is sent by a host accept a screenshare request.
	MessageTypeAcceptScreenshare MessageType = "accept_screenshare"
	// MessageTypeDenycreenshare is sent by a host deny a screenshare request.
	MessageTypeDenyScreenshare MessageType = "deny_screenshare"

	// --- Server-to-Client Event Types ---
	// EventTypeRoomState is sent to a client upon joining, detailing the current room state.
	EventTypeRoomState MessageType = "room_state"
	// EventTypeUserJoined is broadcast when a new user joins the main room.
	EventTypeUserJoined MessageType = "user_joined"
	// EventTypeUserLeft is broadcast when a user leaves.
	EventTypeUserLeft MessageType = "user_left"
	// EventTypeHandsState is broadcast when the state of raised hands changes.
	EventTypeHandsState MessageType = "hands_state"
	// EventTypeAdmissionRequest is sent to hosts when a user wants to join.
	EventTypeAdmissionRequest MessageType = "admission_request"
)

// Message is the structure for all incoming and outgoing WebSocket messages.
type Message struct {
	Type    MessageType `json:"type"`
	Payload any         `json:"payload"`
}

// Payload is the interface that all payload types implement.
type Payload interface{}

// --- Payload Types ---

// ChatPayload is the payload for "chat_message".
type ChatPayload struct {
	SenderID  string `json:"senderId"`
	Content   string `json:"content"`
	Timestamp int64  `json:"timestamp"`
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

// RequestScreensharePayload is the payload for "request_screenshare".
type RequestScreensharePayload struct {
	UserID string `json:"userId"`
}

// AcceptScreensharePayload is the payload for "accept_screenshare".
type AcceptScreensharePayload struct {
	UserID string `json:"userId"`
}

// DenyScreensharePayload is the payload for "deny_screenshare".
type DenyScreensharePayload struct {
	UserID string `json:"userId"`
}

// RoomStatePayload contains the full state of a room.
type RoomStatePayload struct {
	RoomID       string            `json:"roomId"`
	Participants map[string]string `json:"participants"` // Map of UserID to DisplayName
	HandsRaised  []string          `json:"handsRaised"`  // List of UserIDs with hands raised
}

// UserJoinedPayload is the payload for "user_joined".
type UserJoinedPayload struct {
	UserID      string `json:"userId"`
	DisplayName string `json:"displayName"`
}

// UserLeftPayload is the payload for "user_left".
type UserLeftPayload struct {
	UserID string `json:"userId"`
}

// HandsStatePayload is the payload for "hands_state".
type HandsStatePayload struct {
	HandsRaised []string `json:"handsRaised"`
}

// AdmissionRequestPayload is the payload for "admission_request".
type AdmissionRequestPayload struct {
	UserID      string `json:"userId"`
	DisplayName string `json:"displayName"`
	Reason      string `json:"reason,omitempty"`
}
