package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

var portStatus = []PortAndStatus{
	{Port: "8000", Status: http.StatusOK},
}

func GetServerTest(c *gin.Context) {
	c.IndentedJSON(http.StatusOK, portStatus)
}


func GetDataBaseTest(c *gin.Context) {
	db, err := Connect()
	if err != nil {
		panic(err)
	}
	defer db.Close()

	rows, err := db.Query("SELECT * FROM users")
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
