package session

type RoleType string

type ClientIdType string

type RoomIdType string

type ChatId string

type ChatIndex int

type ChatContent string

type DisplayNameType string

type Event string


type ClientInfo struct {
	ClientId    ClientIdType    `json:"clientId"`
	DisplayName DisplayNameType `json:"displayName"`
}

type ChatInfo struct {
	ClientInfo
	ChatId      ``
	ChatIndex   ``
	ChatContent ``	
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
	Payload any    `json:"payload"`
}

// --- Payload Types ---

type RaiseHandPayload 		   = ClientInfo
type LowerHandPayload 		   = ClientInfo
type AcceptWaitingPayload 	   = ClientInfo
type DenyWaitingPayload 	   = ClientInfo
type RequestWaitingPayload 	   = ClientInfo
type AccceptWaitingPayload     = ClientInfo
type ParticipantJoinedPayload  = ClientInfo
type ParticipantLeftPayload    = ClientInfo
type RequestScreensharePayload = ClientInfo
type AcceptScreensharePayload  = ClientInfo
type DenyScreensharePayload    = ClientInfo
type ClientDisconnectPayload   = ClientInfo

// RoomStatePayload contains the full state of a room.
type RoomStatePayload struct {
	ClientInfo
	RoomID         RoomIdType   `json:"roomId"`
	Hosts          []ClientInfo `json:"hosts"`
	Participants   []ClientInfo `json:"participants"`
	HandsRaised    []ClientInfo `json:"handsRaised"`
	WaitingUsers   []ClientInfo `json:"waitingUsers"`
	ScreensharerID []ClientInfo `json:"screensharerId,omitempty"`
}

type AddChatPayload struct {
	ClientInfo
	Content   string `json:"content"`
	Timestamp int64  `json:"timestamp"`
}

type DeleteChatPayload struct {
	ClientInfo
	ChatId ChatId `json:"messageId"`
}

type GetRecentChatsPayload struct{
	ClientInfo
}