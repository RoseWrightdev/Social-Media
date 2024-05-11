package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

func PostRegister(c *gin.Context) {
	db, err := Connect()
	if err != nil {
		panic(err)
	}
	defer db.Close()

	var user UsersSchema
	c.BindJSON(&user)
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		panic(err)
	}

	_, err = db.Exec("INSERT INTO users (username, email, password) VALUES ($1, $2, $3)", user.Username, user.Email, hashedPassword)
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			switch pqErr.Code {
			case "23505":
				c.IndentedJSON(http.StatusConflict, gin.H{
					"message": "Username and/or email already in use.",
				})
				return
			}
		}
		panic(err)
	}

	c.IndentedJSON(http.StatusOK, gin.H{
		"message": "User created",
	})
}
