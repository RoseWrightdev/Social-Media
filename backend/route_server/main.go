package main

import (
  "net/http"
  "github.com/gin-gonic/gin"
  "github.com/gin-contrib/cors"
)

const port = "localhost:8080"

type serverPortAndHealth struct {
  Port   string `json:"port"`
  Status int    `json:"status"`
}

var health = []serverPortAndHealth{
  {Port: port, Status: http.StatusOK},
}

func main() {
  router := gin.Default()

  CORSMiddleware := func() gin.HandlerFunc {
    return cors.New(cors.Config{
      AllowOrigins:   []string{"http://localhost:3000"},
      AllowMethods:   []string{"GET"},
      AllowHeaders:   []string{"Content-Type", "Authorization"},
    })
  }

  router.Use(CORSMiddleware())

  router.GET("/test", getServerTest)
  router.Run(port)
}

func getServerTest(c *gin.Context) {
  c.IndentedJSON(http.StatusOK, health)
}
