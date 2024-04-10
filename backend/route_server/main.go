package main

import (
	"encoding/json"
	"io"
	"net/http"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

const port = "localhost:8080"

type serverPortAndHealth struct {
	Port   string `json:"Port"`
	Status int    `json:"Status"`
}

type pyData struct {
	Port   string `json:"Port"`
	Status int    `json:"Status"`
}

var health = []serverPortAndHealth{
	{Port: port, Status: http.StatusOK},
}

func getServerTest(c *gin.Context) {
	c.IndentedJSON(http.StatusOK, health)
}

func getPyServerTest(c *gin.Context) {
	url := "http://localhost:8000"

	resp, err := http.Get(url)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var data pyData
	err = json.Unmarshal(body, &data)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid data format"})
		return
	}
}

func main() {
	router := gin.Default()

	CORSMiddleware := func() gin.HandlerFunc {
		return cors.New(cors.Config{
			AllowOrigins: []string{"http://localhost:3000", "http://localhost:8000"},
			AllowMethods: []string{"GET"},
			AllowHeaders: []string{"Content-Type", "Authorization"},
		})
	}

	router.Use(CORSMiddleware())
	router.GET("/test", getServerTest)
	router.GET("/pyTest", getPyServerTest)
	router.Run(port)
}
