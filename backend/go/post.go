package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

// PostRegister handles the POST request to /register
func PostRegister(c *gin.Context) {
	//get values from the request parameters
	var email, username, password string
	email = c.Param("email")
	username = c.Param("username")
	password = c.Param("password")
	if email == "" || username == "" || password == "" {
		c.IndentedJSON(http.StatusBadRequest, gin.H{})
		return
	}

	//connect to the database
	db, err := Connect()
	if err != nil {
		panic(err)
	}
	defer db.Close()

	//hash the password before insertion
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		panic(err)
	}

	//insert the user into the database
	_, err = db.Exec("INSERT INTO users (username, email, password) VALUES ($1, $2, $3)", username, email, hashedPassword)
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			switch pqErr.Code {
				// Unique violation, user or email already exists
			case "23505":
				c.IndentedJSON(http.StatusConflict, gin.H{})
				return
			}
		}
		panic(err)
	}
	
	//get the id of the user that was just inserted
	rows, err := db.Query("SELECT id FROM users WHERE username = $1 AND email = $2 AND password = $3", username, email, hashedPassword)
	if err != nil {
		c.IndentedJSON(http.StatusNotFound, gin.H{})
	}
	defer rows.Close()

	var id Id
	for rows.Next() {
		err := rows.Scan(&id.Id)
		if err != nil {
			panic(err)
		}
	}
	//return status OK and the id of the user
	c.IndentedJSON(http.StatusOK, id)
}
