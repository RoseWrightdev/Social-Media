package session

// todo: rewrite test suite
// todo: write file level comment

import (
	"container/list"
	"sync"
	"testing"
	// "github.com/stretchr/testify/assert"
	// "github.com/stretchr/testify/require"
)

// newTestClient creates a client for testing purposes.
func newTestClient(id UserIDType) *Client {
	return &Client{
		UserID: id,
		send:   make(chan []byte, 10), // Buffered channel to avoid blocking in tests
	}
}

// NewTestRoom creates a new, stateful room for testing purposes.
// Exported globally for use accross the codebase.
func NewTestRoom(id RoomIDType, onEmptyCallback func(RoomIDType)) *Room {
	return &Room{
		ID:                   id,
		mu:                   sync.RWMutex{},
		chatHistory:          list.New(),
		maxChatHistoryLength: 10,

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

func TestNewTestRoom(t *testing.T) {
	t.Run("", func(t *testing.T) {})
	t.Run("", func(t *testing.T) {})
	t.Run("", func(t *testing.T) {})
	t.Run("", func(t *testing.T) {})
	t.Run("", func(t *testing.T) {})
	t.Run("", func(t *testing.T) {})
	t.Run("", func(t *testing.T) {})
}

func TestNewRoom(t *testing.T) {
	t.Run("", func(t *testing.T) {})
	t.Run("", func(t *testing.T) {})
	t.Run("", func(t *testing.T) {})
	t.Run("", func(t *testing.T) {})
	t.Run("", func(t *testing.T) {})
	t.Run("", func(t *testing.T) {})
	t.Run("", func(t *testing.T) {})
}

func TestHandleClientDisconnect(t *testing.T) {}

func TestHandleClientConnect(t *testing.T) {
	t.Run("first client becomes host and is admitted", func(t *testing.T) {})
	t.Run("subsequent clients enter waiting room", func(t *testing.T) {})
	t.Run("onEmpty should be called to prevent memory leak", func(t *testing.T) {})
}

func TestBoradcast(t *testing.T) {
	t.Run("", func(t *testing.T) {})
	t.Run("", func(t *testing.T) {})
	t.Run("", func(t *testing.T) {})
	t.Run("", func(t *testing.T) {})
	t.Run("", func(t *testing.T) {})
	t.Run("", func(t *testing.T) {})
}

func TestBroadcastRoomState(t *testing.T) {
	t.Run("", func(t *testing.T) {})
	t.Run("", func(t *testing.T) {})
	t.Run("", func(t *testing.T) {})
	t.Run("", func(t *testing.T) {})
	t.Run("", func(t *testing.T) {})
	t.Run("", func(t *testing.T) {})
}

func TestClientsMapToSlice(t *testing.T) {
	t.Run("", func(t *testing.T) {})
}
