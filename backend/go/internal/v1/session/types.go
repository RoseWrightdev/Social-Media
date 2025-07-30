package session

import "errors"

type RoleType string
type ClientIdType string
type RoomIdType string
type ChatId string
type ChatIndex int
type ChatContent string
type DisplayNameType string
type Event string
type Timestamp int64

type ClientInfo struct {
	ClientId    ClientIdType    `json:"clientId"`
	DisplayName DisplayNameType `json:"displayName"`
}

// This enum is the single source of truth for a client's role.
const (
	RoleTypeWaiting     RoleType = "waiting"
	RoleTypeParticipant RoleType = "participant"
	RoleTypeScreenshare RoleType = "screenshare"
	RoleTypeHost        RoleType = "host"
)

const (
	EventAddChat            Event = "add_chat"
	EventDeleteChat         Event = "delete_chat"
	EventGetRecentChats     Event = "recents_chat"
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
	Event   Event `json:"event"`
	Payload any   `json:"payload"`
}

// --- Payload Types ---

type RaiseHandPayload = ClientInfo
type LowerHandPayload = ClientInfo
type AcceptWaitingPayload = ClientInfo
type DenyWaitingPayload = ClientInfo
type RequestWaitingPayload = ClientInfo
type AccceptWaitingPayload = ClientInfo
type ParticipantJoinedPayload = ClientInfo
type ParticipantLeftPayload = ClientInfo
type RequestScreensharePayload = ClientInfo
type AcceptScreensharePayload = ClientInfo
type DenyScreensharePayload = ClientInfo
type ClientDisconnectPayload = ClientInfo

// RoomStatePayload contains the full state of a room.
type RoomStatePayload struct {
	ClientInfo
	RoomID        RoomIdType   `json:"roomId"`
	Hosts         []ClientInfo `json:"hosts"`
	Participants  []ClientInfo `json:"participants"`
	HandsRaised   []ClientInfo `json:"handsRaised"`
	WaitingUsers  []ClientInfo `json:"waitingUsers"`
	SharingScreen []ClientInfo `json:"sharingScreen,omitempty"`
}

type ChatInfo struct {
	ClientInfo
	ChatId      ChatId      `json:"chatId"`
	Timestamp   Timestamp   `json:"chatIndex"`
	ChatContent ChatContent `json:"chatContent"`
}

// Validate validates the ChatInfo payload
func (c ChatInfo) Validate() error {
	if len(string(c.ChatContent)) == 0 {
		return errors.New("chat content cannot be empty")
	}
	if len(string(c.ChatContent)) > 1000 {
		return errors.New("chat content cannot exceed 1000 characters")
	}
	if string(c.ClientId) == "" {
		return errors.New("client ID cannot be empty")
	}
	if string(c.DisplayName) == "" {
		return errors.New("display name cannot be empty")
	}
	return nil
}

type AddChatPayload = ChatInfo
type DeleteChatPayload = ChatInfo
type GetRecentChatsPayload = ChatInfo
