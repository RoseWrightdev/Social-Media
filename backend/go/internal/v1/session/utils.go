package session

import (
	"log/slog"
	"os"
	"strings"
	"fmt"
)

// GetAllowedOriginsFromEnv reads a comma-separated list of origins from an environment variable.
func GetAllowedOriginsFromEnv(envVarName string, defaultEnvs []string) []string {
	// Example: ALLOWED_ORIGINS="http://localhost:3000,https://your-app.com"
	originsStr := os.Getenv(envVarName)
	if originsStr == "" {
		// Provide sensible defaults for local development if the env var isn't set.
		slog.Warn(fmt.Sprintf("%s environment variable not set. Using default development origins:\n%s", envVarName, defaultEnvs))
		return defaultEnvs
	}
	return strings.Split(originsStr, ",")
}

// NewTestClient is a helper for testing to create a client.
func NewTestClient() *Client {
	return &Client{
		send: make(chan []byte, 1),
	}
}

// NewTestRoom creates a new, stateful room for testing purposes.
func NewTestRoom(id string, onEmptyCallback func(string)) *Room {
	return &Room{
		ID:           id,
		participants: make(map[*Client]bool),
		waitingRoom:  make(map[*Client]bool),
		handsRaised:  make(map[*Client]bool),
		hosts:        make(map[*Client]bool),
		screenshares: make(map[*Client]bool),
		onEmpty: onEmptyCallback,
	}
}
