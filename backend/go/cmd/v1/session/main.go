package main

import (
	"context"
	"log/slog"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/gin-contrib/cors"
	"github.com/joho/godotenv"

	"Social-Media/backend/go/internal/v1/auth"
	"Social-Media/backend/go/internal/v1/session"
)

func main() {
	// Load .env file for local development.
	if err := godotenv.Load(); err != nil {
		slog.Warn(".env file not found, relying on environment variables.")
	}

	// Get Auth0 configuration from environment variables.
	auth0Domain := os.Getenv("AUTH0_DOMAIN")
	auth0Audience := os.Getenv("AUTH0_AUDIENCE")
	if auth0Domain == "" || auth0Audience == "" {
		slog.Error("AUTH0_DOMAIN and AUTH0_AUDIENCE must be set in environment")
		return
	}

	// Create the Auth0 token validator.
	authValidator, err := auth.NewValidator(context.Background(), auth0Domain, auth0Audience)
	if err != nil {
		slog.Error("Failed to create auth validator", "error", err)
		return
	}

	// --- Create Hubs with Dependencies ---
	// Each feature gets its own hub, configured with the same dependencies.
	zoomCallHub := session.NewHub(authValidator)
	screenShareHub := session.NewHub(authValidator)
	chatHub := session.NewHub(authValidator)

	// --- Set up Router ---
	router := gin.Default()
	config := cors.DefaultConfig()
	allowedOrigins := session.GetAllowedOriginsFromEnv("ALLOWED_ORIGINS", []string{"http://localhost:3000"})
	config.AllowOrigins = allowedOrigins
	router.Use(cors.New(config))
	wsGroup := router.Group("/ws")
	{
		wsGroup.GET("/zoom/:roomId", zoomCallHub.ServeWs)
		wsGroup.GET("/screenshare/:roomId", screenShareHub.ServeWs)
		wsGroup.GET("/chat/:roomId", chatHub.ServeWs)
	}

	// Start the server.
	slog.Info("API server starting on :8080")
	if err := router.Run(":8080"); err != nil {
		slog.Error("Failed to run server", "error", err)
	}
}
