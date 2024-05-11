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
	router.GET("/server", GetServer)
	router.GET("/database", GetDataBase)
	router.GET("/user/:id", GetUserById)
	router.GET("/login/:email/:password", GetLogin)

	// TODO: Add the following routes:
	//router.GET("/post/:id", GetPostById)
	//router.GET("/posts", GetPosts)
	//router.GET("/user/:id/posts", GetPostsByUserId)
	//router.GET("/user/:id/posts/:post_id", GetPostByUserIdAndPostId)

	//Put router.PUT("/user/:id", PutUserById)
	//Put router.PUT("/post/:id", PutPostById)
	//Put router.PUT("/user/:id/post/:post_id", PutPostByUserIdAndPostId)

	//Delete router.DELETE("/user/:id", DeleteUserById)
	//Delete router.DELETE("/post/:id", DeletePostById)
	//Delete router.DELETE("/user/:id/post/:post_id", DeletePostByUserIdAndPostId)
	//Delete router.DELETE("/user/:id/posts", DeletePostsByUserId)

	//Post

	router.POST("/register", PostRegister)
	
	router.Run("localhost:8080")
}



