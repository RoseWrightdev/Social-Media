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
			AllowMethods: []string{"GET", "POST", "PUT", "DELETE"},
			AllowHeaders: []string{"Content-Type", "Authorization"},
		})
	}
	router.Use(CORSMiddleware())

	//Get
	router.GET("/test", GetServerTest)
	router.GET("/database", GetDataBaseTest)
	//router.GET("/database/:id", GetDataBaseTestById)

	//Post
	router.POST("/register", PostRegister)
	router.Run("localhost:8080")
}



