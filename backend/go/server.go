package main

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func Run() {
	router := gin.Default()
	CORSMiddleware := func() gin.HandlerFunc {
		return cors.New(cors.Config{
			AllowOrigins: []string{"http://localhost:3000"},
			AllowMethods: []string{"GET"},
			AllowHeaders: []string{"Content-Type", "Authorization"},
		})
	}

	router.Use(CORSMiddleware())
	router.GET("/test", GetServerTest)
	router.GET("/database", GetDataBaseTest)
	router.Run("localhost:8080")
}



