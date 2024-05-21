package main

import (
	"database/sql"
	"net/http"
	"time"
	"log"
	"crypto/rand"
	"encoding/hex"
	"os"

	"github.com/joho/godotenv"
	gomail "gopkg.in/mail.v2"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

// PostRegister handles the POST request to /register
// It inserts a new user into the database
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
		c.IndentedJSON(http.StatusInternalServerError, gin.H{})
		return
	}
	defer db.Close()

	//hash the password before insertion
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		c.IndentedJSON(http.StatusInternalServerError, gin.H{})
		return
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
		c.IndentedJSON(http.StatusInternalServerError, gin.H{})
		return
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
			c.IndentedJSON(http.StatusInternalServerError, gin.H{})
			return
		}
	}
	//return status OK and the id of the user
	c.IndentedJSON(http.StatusOK, id)
}

// PostResetPassword handles the POST request to /resetpassword
// It generates a token and sends an email to the user with a link to reset the password

func PostResetPassword(c *gin.Context) {
	var userSubmitedEmail = c.Param("email")
	if userSubmitedEmail == "" {
		c.IndentedJSON(http.StatusBadRequest, gin.H{})
		return
	}

	db, err := Connect()
	if err != nil {
		panic(err)

	}
	defer db.Close()

	rows, err := db.Query("SELECT id FROM users WHERE email = $1", userSubmitedEmail)
	if err != nil {
		//always return 200 to avoid email fishing
		c.IndentedJSON(http.StatusOK, gin.H{})
	}
	defer rows.Close()

	//get the id of the user that was just inserted
	var userId string
	rows.Next()
	rows.Scan(&userId)

	resetToken := generateResetToken()
	//expire in 2 hours
	resetTokenExpireIn := 2 * time.Hour

	//concurently expire
	errCh := make(chan error)

	go func() {
			errCh <- tokenExpire(resetToken, resetTokenExpireIn)
	}()

	go func() {
	err = <- errCh
		if err != nil {
				log.Printf("An error occurred: %v", err)
		}
	}()
	_, err = addRestTokenToDatabase(resetToken, userId, db)
	if err != nil {
		panic(err)
	}
	sendEmail(resetToken, userSubmitedEmail, c)

}


func generateResetToken() string {
	// create token
	resetToken := make([]byte, 31)
	_, err := rand.Read(resetToken)
	if err != nil {
		panic(err)
	}

	//return token
	return hex.EncodeToString(resetToken)
}

func tokenExpire(resetToken string, timeUntilExpriation time.Duration) (error) {
	//expire token
	time.Sleep(timeUntilExpriation)

	db, err := Connect()
	if err != nil {
		panic(err)

	}
	defer db.Close()
	
	//delete token from database
	_, err = db.Exec("UPDATE USERS SET reset_token = NULL WHERE reset_token = $1", resetToken)
	if err != nil {
    log.Printf("An error occurred: %v", err)
    return err
	}
	return nil
}


func addRestTokenToDatabase(token string, userId string, db *sql.DB) ([]byte, error) {
	_, err := db.Exec("UPDATE USERS SET reset_token = $1 WHERE id = $2", token, userId)
	if err != nil {
		return nil, err
	}
	return nil, nil
}

func sendEmail(token string, toEmail string, c *gin.Context) {
	err := godotenv.Load(".env")
	if err != nil {
		panic(err)
	}

	var fromEmail = os.Getenv("FromEmail")
	var fromPassword = os.Getenv("FromPassword")

	m := gomail.NewMessage()
	m.SetHeader("From", fromEmail)
	m.SetHeader("To", toEmail)
	m.SetHeader("Subject", "Password Reset")
	m.SetBody("text/html", "Click <a href='http://localhost:3000/login/resetpassword/"+token+"'>here</a> to reset your password")

	d := gomail.NewDialer("smtp.gmail.com", 587, fromEmail, fromPassword)
	if err := d.DialAndSend(m); err != nil {
		panic(err)
	}
	c.IndentedJSON(http.StatusOK, gin.H{})
}


// PostUpdatePassword handles the POST request to /updatePassword
// It updates the password of the user with the token
func PostUpdatePassword(c *gin.Context) {
	var token = c.Param("token")
	var password = c.Param("password")
	if token == "" || password == "" {
		c.IndentedJSON(http.StatusBadRequest, gin.H{})
		return
	}

	db, err := Connect()
	if err != nil {
		c.IndentedJSON(http.StatusInternalServerError, gin.H{})
		return
	}
	defer db.Close()

	rows, err := db.Query("SELECT id FROM users WHERE reset_token = $1", token)
	if err != nil {
		c.IndentedJSON(http.StatusNotFound, gin.H{})
	}
	defer rows.Close()

	var userId string
	rows.Next()
	rows.Scan(&userId)

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		c.IndentedJSON(http.StatusInternalServerError, gin.H{})
		return
	}

	_, err = db.Exec("UPDATE USERS SET password = $1 WHERE id = $2", hashedPassword, userId)
	if err != nil {
		c.IndentedJSON(http.StatusInternalServerError, gin.H{})
		return
	}
	c.IndentedJSON(http.StatusOK, gin.H{})
}
