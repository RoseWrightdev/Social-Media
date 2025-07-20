package session

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGetAllowedOriginsFromEnv(t *testing.T) {
	t.Run("should return defaults if env is not set", func (t *testing.T) {
		allowedOrigins := GetAllowedOriginsFromEnv("null", []string{"localhost:3000"})
		assert.Equal(t, allowedOrigins, []string{"localhost:3000"})

	})
	
	t.Run("should return env if env is set at name envVarName", func (t *testing.T) {
		// mock env
		t.Setenv("ALLOWED_ORIGINS", "localhost:5050,localhost:1234")
		allowedOrigins := GetAllowedOriginsFromEnv("ALLOWED_ORIGINS", []string{"localhost:3000"})
		assert.Equal(t, allowedOrigins, []string{"localhost:5050", "localhost:1234"})
	})
}
