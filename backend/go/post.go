package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func PostRegister(c *gin.Context) {
	db, err := Connect()
	if err != nil {
		panic(err)
	}
	defer db.Close()

	var user UsersSchema
	c.BindJSON(&user)

	_, err = db.Exec("INSERT INTO users (username, email, password) VALUES ($1, $2, $3)", user.Username, user.Email, user.Password);
		if err != nil {
		panic(err)
	}

	c.IndentedJSON(http.StatusOK, gin.H{
		"message": "User created",
	})
}