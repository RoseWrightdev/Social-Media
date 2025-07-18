package main

import (
	"log/slog"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv" 

	"Social-Media/backend/go/internal/v1/signaling"
)

func main() {
	// Set up the Gin router.
	router := gin.Default()

	// Set env
	err := godotenv.Load()
	if err != nil {
		slog.Warn("Warning: .env file not found")
	}

	allowedOrigins := signaling.GetAllowedOriginsFromEnv("ALLOWED_ORIGINS", []string{"localhost:3000"})

	// --- Create a separate hub for each feature ---
	// This hub manages WebSocket connections for video calls.
	zoomCallHub := signaling.NewHub(allowedOrigins)
	// This hub manages WebSocket connections for screen sharing.
	screenShareHub := signaling.NewHub(allowedOrigins)
	// This hub manages WebSocket connections for text chat.
	chatHub := signaling.NewHub(allowedOrigins)

	// --- Group WebSocket endpoints under a common path ---
	wsGroup := router.Group("/ws")
	{
		// The client would connect to ws://.../ws/zoom/some-room-id
		wsGroup.GET("/zoom/:roomId", zoomCallHub.ServeWs)

		// The client would connect to ws://.../ws/screenshare/some-room-id
		wsGroup.GET("/screenshare/:roomId", screenShareHub.ServeWs)

		// The client would connect to ws://.../ws/chat/some-room-id
		wsGroup.GET("/chat/:roomId", chatHub.ServeWs)
	}

	// Start the server.
	slog.Info("API server starting on :8080 with multiple WebSocket endpoints")
	if err := router.Run(":8080"); err != nil {
		slog.Error("Fail to run server", "err", err)
	}
}
