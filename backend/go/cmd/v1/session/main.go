package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"Social-Media/backend/go/internal/v1/auth"
	"Social-Media/backend/go/internal/v1/session"
)

func main() {
	// Load .env file for local development.
	// The .env file is in the project root (backend/go/.env)
	if err := godotenv.Load("../../../.env"); err != nil {
		slog.Warn(".env file not found, relying on environment variables.", "error", err)
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

	// --- Set up Server ---
	router := gin.Default()
	// Cors
	config := cors.DefaultConfig()
	allowedOrigins := session.GetAllowedOriginsFromEnv("ALLOWED_ORIGINS", []string{"http://localhost:3000"})
	config.AllowOrigins = allowedOrigins
	router.Use(cors.New(config))

	// Error handling
	router.Use(gin.Recovery())

	// Routing
	wsGroup := router.Group("/ws")
	{
		wsGroup.GET("/zoom/:roomId", zoomCallHub.ServeWs)
		wsGroup.GET("/screenshare/:roomId", screenShareHub.ServeWs)
		wsGroup.GET("/chat/:roomId", chatHub.ServeWs)
	}

	// Start the server.
	srv := &http.Server{
		Addr:    ":8080",
		Handler: router,
	}

	// --- Graceful Shutdown ---
	// Start the server in a goroutine so it doesn't block.
	go func() {
		slog.Info("API server starting on :8080")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("Failed to run server", "error", err)
		}
	}()

	// Wait for an interrupt signal to gracefully shut down the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	slog.Info("Shutting down server...")

	// The context is used to inform the server it has 5 seconds to finish
	// the requests it is currently handling
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("Server forced to shutdown:", "error", err)
	}

	slog.Info("Server exiting")
}
