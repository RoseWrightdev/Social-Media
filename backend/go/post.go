package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
)

func PostRegister(c *gin.Context) {
	db, err := Connect()
	if err != nil {
		panic(err)
	}
	defer db.Close()

	var user UsersSchema
	c.BindJSON(&user)

	_, err = db.Exec("INSERT INTO users (username, email, password) VALUES ($1, $2, $3)", user.Username, user.Email, user.Password)
	if err != nil {
			if pqErr, ok := err.(*pq.Error); ok {
					switch pqErr.Code {
					case "23505":
							c.IndentedJSON(http.StatusConflict, gin.H{
									"message": "Username or email already in exists",
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