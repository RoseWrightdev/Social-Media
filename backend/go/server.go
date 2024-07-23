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
			AllowHeaders: []string{"Content-Type", "Authorization", "application/json"},
		})
	}
	router.Use(CORSMiddleware())

	//Get
	router.GET("/posts", GetPosts)
	

	//Post
	router.POST("/user", PostUserById)
	router.POST("/login", PostLogin)
	router.POST("/register/:email/:username/:password", PostRegister)
	router.POST("/resetpassword/:email", PostResetPassword)
	router.POST("/updatepassword/:token/:password", PostUpdatePassword)
	router.POST("/posts", PostPosts)
	router.POST("/attachment", PostAttachmentByPostID)
	router.POST("/pfp", PostProfilePictureByUserIDRequest)

	router.Run("localhost:8080")
}
