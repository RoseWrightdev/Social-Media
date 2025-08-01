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

// MockValidator is a development-only token validator that accepts any token
type MockValidator struct{}

func (m *MockValidator) ValidateToken(tokenString string) (*auth.CustomClaims, error) {
	// For development, return a mock user
	return &auth.CustomClaims{
		Name:  "Dev User",
		Email: "dev@example.com",
	}, nil
}

func main() {
	// Load .env file for local development.
	// Try multiple paths to handle different ways of running the app
	envPaths := []string{".env", "../../../.env", "../../.env"}
	var envLoaded bool

	for _, path := range envPaths {
		if err := godotenv.Load(path); err == nil {
			slog.Info("Loaded environment from", "path", path)
			envLoaded = true
			break
		}
	}

	if !envLoaded {
		slog.Warn("No .env file found in any expected location, relying on environment variables")
	}

	// Get Auth0 configuration from environment variables.
	auth0Domain := os.Getenv("AUTH0_DOMAIN")
	auth0Audience := os.Getenv("AUTH0_AUDIENCE")
	skipAuth := os.Getenv("SKIP_AUTH") == "true"
	developmentMode := os.Getenv("DEVELOPMENT_MODE") == "true"

	if developmentMode {
		slog.Info("🔧 Running in DEVELOPMENT MODE - Auth validation may be relaxed")
	}

	var authValidator *auth.Validator
	if !skipAuth {
		if auth0Domain == "" || auth0Audience == "" {
			slog.Error("AUTH0_DOMAIN and AUTH0_AUDIENCE must be set in environment when SKIP_AUTH=false")
			return
		}

		// Create the Auth0 token validator.
		var err error
		authValidator, err = auth.NewValidator(context.Background(), auth0Domain, auth0Audience)
		if err != nil {
			slog.Error("Failed to create auth validator", "error", err)
			return
		}
		slog.Info("✅ Auth0 validator initialized", "domain", auth0Domain, "audience", auth0Audience)
	} else {
		slog.Warn("⚠️ Authentication DISABLED for development - DO NOT USE IN PRODUCTION")
		authValidator = nil
	}

	// --- Create Hubs with Dependencies ---
	// Each feature gets its own hub, configured with the same dependencies.
	var validator session.TokenValidator
	if authValidator != nil {
		validator = authValidator
	} else {
		validator = &MockValidator{}
	}

	zoomCallHub := session.NewHub(validator)
	screenShareHub := session.NewHub(validator)
	chatHub := session.NewHub(validator)

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
