package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

var portStatus = []PortAndStatus{
	{Port: "8000", Status: http.StatusOK},
}

func GetServer(c *gin.Context) {
	c.IndentedJSON(http.StatusOK, portStatus)
}


func GetDataBase(c *gin.Context) {
	db, err := Connect()
	if err != nil {
		panic(err)
	}
	defer db.Close()

	rows, err := db.Query("SELECT * FROM users LIMIT 10")
	if err != nil {
		panic(err)
	}
	defer rows.Close()

	var users []UsersSchema
	for rows.Next() {
		var user UsersSchema
		err := rows.Scan(&user.Id, &user.Password, &user.Email, &user.Username)
		if err != nil {
			panic(err)
		}
		users = append(users, user)
	}
	c.IndentedJSON(http.StatusOK, users)
}

func GetUserById(c *gin.Context) {
	db, err := Connect()
	if err != nil {
		panic(err)
	}
	defer db.Close()

	id := c.Param("id")
	rows, err := db.Query("SELECT * FROM users WHERE id = $1", id)
	if err != nil {
		panic(err)
	}
	defer rows.Close()

	var user UsersSchema
	for rows.Next() {
		err := rows.Scan(&user.Id, &user.Password, &user.Email, &user.Username)
		if err != nil {
			panic(err)
		}
	}
	c.IndentedJSON(http.StatusOK, user)
}