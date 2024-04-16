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

	for rows.Next() {
		var id int
		var username string
		var email string

		err := rows.Scan(&id, &username, &email)
		if err != nil {
			panic(err)
		}

		var data = []UsersSchema{
			{
				Id:       id,
				Username: username,
				Email:    email,
			},
		}

		c.IndentedJSON(http.StatusOK, data)
	}
}
