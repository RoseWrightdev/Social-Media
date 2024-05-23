package main

import (
	"testing"
)


func TestConnect(t *testing.T) {
	db, err := Connect()

	if err != nil {
		t.Fatalf("Connect() returned an error: %v", err)
	}
	if db == nil {
		t.Errorf("Connect() returned nil db")
	}
}	