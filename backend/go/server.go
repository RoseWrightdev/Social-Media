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
	router.GET("/user/:id", GetUserById)
	router.GET("/login/:email/:password", GetLogin)
	router.GET("/attachment/image/:postid", GetImageAttachment)
	router.GET("/attachment/video/:postid", GetVideoAttachment)
	router.GET("/profilepicture/:userid", GetProfilePicture)

	//Post
	router.POST("/register/:email/:username/:password", PostRegister)
	router.POST("/resetpassword/:email", PostResetPassword)
	router.POST("/updatepassword/:token/:password", PostUpdatePassword)
	// router.POST("/upload/profilepicture/:userid/:image", PostUploadProfilePicture)
	// router.POST("/upload/imageattachment/:userid/:image", PostUploadImageAttachment)
	// router.POST("/upload/videoattachment/:userid/:video", PostUploadVideoAttachment)
	router.POST("/posts", PostPosts)

	router.Run("localhost:8080")
}
