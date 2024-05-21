package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// GetDataBase handles the GET request to /database
// It returns the first 10 users in the database
// used for testing purposes
func GetDataBase(c *gin.Context) {
	db, err := Connect()
	if err != nil {
		c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer db.Close()

	rows, err := db.Query("SELECT * FROM users LIMIT 10")
	if err != nil {
		c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var users []UsersSchema
	for rows.Next() {
		var user UsersSchema
		err := rows.Scan(&user.Id, &user.Password, &user.Email, &user.Username, &user.ResetToken)
		if err != nil {
			c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		users = append(users, user)
	}
	c.IndentedJSON(http.StatusOK, users)
}

// GetUserById handles the GET request to /user/:id
// It returns the user with the specified id
// used for testing purposes
// in actual use the function would not return the entirity of the user data
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
		err := rows.Scan(&user.Id, &user.Password, &user.Email, &user.Username, &user.ResetToken)
		if err != nil {
			panic(err)
		}
	}
	c.IndentedJSON(http.StatusOK, user)
}

// GetLogin handles the GET request to /login/:email/:password1
// it returns the id and password of the user with the specified email
func GetLogin(c *gin.Context) {
	db, err := Connect()
	if err != nil {
		c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}
	defer db.Close()

	email := c.Param("email")
	password := c.Param("password")

	rows, err := db.Query("SELECT id, password FROM users WHERE email = $1", email)
	if err != nil {
		c.IndentedJSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var userIdAndPassword IdAndPassword
	for rows.Next() {
		err := rows.Scan(&userIdAndPassword.Id, &userIdAndPassword.Password)
		if err != nil {
			c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if bcrypt.CompareHashAndPassword([]byte(userIdAndPassword.Password), []byte(password)) == nil {
			c.IndentedJSON(http.StatusOK, userIdAndPassword)
			return
		}
	}

	c.IndentedJSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
}
