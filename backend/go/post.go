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
func PostRegister(c *gin.Context) {
	//get values from the request parameters
	var json PostRegisterJSON

	if err := c.BindJSON(&json); err != nil {
    c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
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
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(json.Password), bcrypt.DefaultCost)
	if err != nil {
		c.IndentedJSON(http.StatusInternalServerError, gin.H{})
		return
	}

	//insert the user into the database
	_, err = db.Exec("INSERT INTO users (username, email, password) VALUES ($1, $2, $3)", json.Username, json.Email, hashedPassword)
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

	//fix use RETURNING statement to get this value
	//get the id of the user that was just inserted
	rows, err := db.Query("SELECT id FROM users WHERE username = $1 AND email = $2 AND password = $3", json.Username, json.Email, hashedPassword)
	if err != nil {
		c.IndentedJSON(http.StatusNotFound, gin.H{})
	}
	defer rows.Close()

	var id IdJSON
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
	var json EmailJSON
	if err := c.BindJSON(&json); err != nil {
    c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
    return
  }

	db, err := Connect()
	if err != nil {
		panic(err)

	}
	defer db.Close()

	rows, err := db.Query("SELECT id FROM users WHERE email = $1", json.Email)
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
	SendEmail(resetToken, json.Email, c)
}


// PostUpdatePassword handles the POST request to /updatePassword
// It updates the password of the user with the token
func PostUpdatePassword(c *gin.Context) {

	var json PostUpdatePasswordJSON
	if err := c.BindJSON(&json); err != nil {
    c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
    return
  }

	db, err := Connect()
	if err != nil {
		c.IndentedJSON(http.StatusInternalServerError, gin.H{})
		return
	}
	defer db.Close()

	rows, err := db.Query("SELECT id FROM users WHERE reset_token = $1", json.Token)
	if err != nil {
		c.IndentedJSON(http.StatusNotFound, gin.H{})
	}
	defer rows.Close()

	var userId string
	rows.Next()
	rows.Scan(&userId)

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(json.Password), bcrypt.DefaultCost)
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
  var json PostPostsJSON

  if err := c.BindJSON(&json); err != nil {
    c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
    return
  }

  if json.ContentType != "photos" && json.ContentType != "videos" {
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
  err = db.QueryRow("INSERT INTO posts (parent_id, text_content) VALUES ($1, $2) RETURNING id", json.ParentId, json.TextContent).Scan(&postid)
  if err != nil {
    c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
    return
  }

	// decode the file content before calling ProcessPostAttachmentData
	decodedFileContent, err := base64.StdEncoding.DecodeString(json.File)
	if err != nil {
			c.IndentedJSON(http.StatusBadRequest, gin.H{"error": "Invalid file data"})
			return
	}

	// Pass the decoded file content to ProcessPostAttachmentData
	err = ProcessPostAttachmentData(postid, json.ContentType, decodedFileContent)
	if err != nil {
			c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
	}

  // return 200
  c.IndentedJSON(http.StatusOK, gin.H{"code":"200"})
}


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

// POSTLogin handles the POST request to /login/:email/:password1
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


func PostAttachmentByPostID(c *gin.Context) {
	var req PostAttachmentByPostIDReq
	if err := c.BindJSON(&req); err != nil {
    c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
    return
  }

	var json PostAttachmentByPostIDRes
	content, extension, err := GetFileFromPostID(req.PostId)
		if err != nil {
			panic(err)
		}
	
	json.Extension = extension
	json.EndcodedAttatchment = base64.StdEncoding.EncodeToString(content)
	c.IndentedJSON(http.StatusOK, json)
}
