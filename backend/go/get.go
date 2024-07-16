package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)


func PostUserById(c *gin.Context) {
	db, err := Connect()
	if err != nil {
		panic(err)
	}
	defer db.Close()

	var json IdJSON

	if err := c.BindJSON(&json); err != nil {
    c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
    return
  }

	rows, err := db.Query("SELECT * FROM users WHERE id = $1", json.Id)
	if err != nil {
		panic(err)
	}
	defer rows.Close()

	var user UsersJSON
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
func PostLogin(c *gin.Context) {
	db, err := Connect()
	if err != nil {
		c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}
	defer db.Close()

	var json GetLoginJSON

	if err := c.BindJSON(&json); err != nil {
    c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
    return
  }

	rows, err := db.Query("SELECT id, password FROM users WHERE email = $1", json.Email)
	if err != nil {
		c.IndentedJSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var userIdAndPassword IdPasswordJSON
	for rows.Next() {
		err := rows.Scan(&userIdAndPassword.Id, &userIdAndPassword.Password)
		if err != nil {
			c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if bcrypt.CompareHashAndPassword([]byte(userIdAndPassword.Password), []byte(json.Password)) == nil {
			c.IndentedJSON(http.StatusOK, userIdAndPassword)
			return
		}
	}

	c.IndentedJSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
}


// todo 

// func GetPosts(c *gin.Context) {

// }

// func GetProfilePicture(c *gin.Context) {

// }

// func GetImageAttachment(c *gin.Context) {
	
// }

// func GetVideoAttachment(c *gin.Context) {
	
// }