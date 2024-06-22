package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"os"

	"github.com/gin-gonic/gin"
)


func TestGetUserById(t *testing.T) {
	testUserId := os.Getenv("TEST_USER_ID")
	r := gin.Default()
	r.GET("/user/:id", GetUserById)


	req, err := http.NewRequest("GET", "/user/" + testUserId, nil)
	if err != nil {
			t.Fatal(err)
	}

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
			t.Fatalf("expected status %d; got %d with body: %v", http.StatusOK, w.Code, w.Body.String())
	}
}
