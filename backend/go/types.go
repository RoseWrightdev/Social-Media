package main

type PortAndStatus struct {
	Port   string `json:"port"`
	Status int    `json:"status"`
}

type UsersSchema struct {
	Id       string `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type Id struct { 
	Id string `json:"id"`
}

type Status struct { 
	Status string `json:"status"`
}