package main

type PortAndStatus struct {
	Port   string `json:"port"`
	Status int    `json:"status"`
}

type UsersSchema struct {
	Id       int    `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
}