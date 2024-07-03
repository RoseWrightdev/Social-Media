package main

import (
	"encoding/base64"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

// PostRegister handles the POST request to /register
// It inserts a new user into the database
// fix use req body

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
// fix use req body

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

	resetToken := GenerateResetToken()
	//expire in 2 hours
	resetTokenExpireIn := 2 * time.Hour

	//concurently expire
	errCh := make(chan error)

	go func() {
			errCh <- TokenExpire(resetToken, resetTokenExpireIn)
	}()

	go func() {
	err = <- errCh
		if err != nil {
				log.Printf("An error occurred: %v", err)
		}
	}()
	_, err = AddRestTokenToDatabase(resetToken, userId, db)
	if err != nil {
		panic(err)
	}
	SendEmail(resetToken, userSubmitedEmail, c)

}


// PostUpdatePassword handles the POST request to /updatePassword
// It updates the password of the user with the token
// fix use req body

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


func PostPosts(c *gin.Context) {
  type RequestBody struct {
    ParentId     string `json:"id"`
    TextContent  string `json:"text"`
    ContentType  string `json:"type"`
    File         string `json:"file"`
  }

  var requestBody RequestBody

  if err := c.BindJSON(&requestBody); err != nil {
    c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
    return
  }

  if requestBody.ContentType != "photos" && requestBody.ContentType != "videos" {
    c.IndentedJSON(http.StatusBadRequest, gin.H{"error": "unsupported file type"})
    return
  }

  // Connect to the database
  db, err := Connect()
  if err != nil {
    c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
    return
  }
  defer db.Close()

  // Insert into database
  var postid string
  err = db.QueryRow("INSERT INTO posts (parent_id, text_content) VALUES ($1, $2) RETURNING id", requestBody.ParentId, requestBody.TextContent).Scan(&postid)
  if err != nil {
    c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
    return
  }

	// decode the file content before calling ProcessPostAttachmentData
	decodedFileContent, err := base64.StdEncoding.DecodeString(requestBody.File)
	if err != nil {
			c.IndentedJSON(http.StatusBadRequest, gin.H{"error": "Invalid file data"})
			return
	}

	// Pass the decoded file content to ProcessPostAttachmentData
	err = ProcessPostAttachmentData(postid, requestBody.ContentType, decodedFileContent)
	if err != nil {
			c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
	}

  // return 200
  c.IndentedJSON(http.StatusOK, gin.H{"code":"200"})
}

