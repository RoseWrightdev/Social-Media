// Package session - utils.go
//
// This file contains utility functions used throughout the session package.
// These utilities provide common functionality for environment configuration,
// debugging, and cross-cutting concerns.
//
// Utility Categories:
//   - Environment configuration helpers
//   - Debug and logging utilities
//   - Common helper functions
package session

import (
	"fmt"
	"log/slog"
	"os"
	"runtime"
	"strings"
)

// GetAllowedOriginsFromEnv reads and parses CORS allowed origins from environment variables.
// This function provides flexible CORS configuration for different deployment environments
// while offering sensible defaults for local development.
//
// Environment Variable Format:
// The function expects a comma-separated list of URLs in the specified environment variable:
//
//	ALLOWED_ORIGINS="http://localhost:3000,https://myapp.com,https://staging.myapp.com"
//
// Development Fallback:
// If the environment variable is not set, the function returns the provided
// default origins and logs a warning. This ensures the application works
// out-of-the-box in development environments.
//
// Security Considerations:
// - Always validate origins in production environments
// - Avoid wildcard origins in production
// - Consider using specific domains rather than broad patterns
//
// Parameters:
//   - envVarName: Name of the environment variable to read (e.g., "ALLOWED_ORIGINS")
//   - defaultEnvs: Fallback origins to use if environment variable is not set
//
// Returns:
//   - Slice of origin strings parsed from the environment variable or defaults
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

// GetFuncName retrieves the name of the calling function for logging and debugging.
// This utility function uses Go's runtime reflection to determine the name
// of the function that called it, which is useful for structured logging.
//
// Implementation Details:
// The function uses runtime.Caller(1) to get information about the calling
// function (1 level up the call stack) and extracts the function name from
// the program counter information.
//
// Usage Pattern:
// Typically used in logging helpers and error reporting:
//
//	slog.Info("Handler called", "function", GetFuncName())
//	logHelper(ok, client.ID, GetFuncName(), room.ID)
//
// Performance Considerations:
// Runtime reflection has some overhead, so this function should primarily
// be used in logging contexts where the overhead is acceptable compared
// to the debugging benefits.
//
// Returns:
//   - String containing the fully qualified name of the calling function
func GetFuncName() string {
	pc, _, _, _ := runtime.Caller(1)
	return fmt.Sprintf("%s", runtime.FuncForPC(pc).Name())
}
