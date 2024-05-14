package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
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

func GetLogin(c *gin.Context) {
	db, err := Connect()
	if err != nil {
		panic(err)
	}
	defer db.Close()

	email := c.Param("email")
	password := c.Param("password")
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		panic(err)
	}

	rows, err := db.Query("SELECT * FROM users WHERE email = $1 AND password = $2", email, hashedPassword)	
	if err != nil {
		c.IndentedJSON(http.StatusUnauthorized, gin.H{})
		return
	}
	defer rows.Close()

	var user UsersSchema
	c.Bind(&user)
	for rows.Next() {
		err := rows.Scan(&user.Id, &user.Password, &user.Email, &user.Username)
		if err != nil {
			panic(err)
		}
		if bcrypt.CompareHashAndPassword([]byte(user.Password), hashedPassword) != nil {
			c.IndentedJSON(http.StatusOK, user)
			return
		}
	}
	c.IndentedJSON(http.StatusUnauthorized, user)
}
