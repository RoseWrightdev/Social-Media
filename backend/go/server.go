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
	router.GET("/database", GetDataBase)
	router.GET("/user/:id", GetUserById)
	router.GET("/login/:email/:password", GetLogin)
	//router.GET("/resetpassword/:email", GetResetPassword)

	//Post
	router.POST("/register/:email/:username/:password", PostRegister)

	//resetpassword checks if the email exists in the database
	// if the email exists it attaches a token to the user account
	// sends a reset password email with that token
	// the user can then use the token to update their password
	router.POST("/resetpassword/:email", PostResetPassword)

	//updatepassword checks if the token exists in the database
	// if the token exists it updates the password for the user account
	router.POST("/updatepassword/:token/:password", PostUpdatePassword)
	
	router.Run("localhost:8080")
}



