package main

import (
	"net/http"
	"github.com/gin-gonic/gin"
)

const port = "localhost:8080"

type serverPortAndHealth struct {
	Port string `json:"port"`
	Status uint `json:"status"`
}

var health = []serverPortAndHealth{
	{Port: port, Status: http.StatusOK},
}

func main() {
	router := gin.Default()
	router.GET("/severTest", getSeverTest)
	router.Run(port)
}

func getSeverTest(c *gin.Context) {
	c.IndentedJSON(http.StatusOK, health)
}
