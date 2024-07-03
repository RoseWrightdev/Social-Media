package main

import (
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/joho/godotenv"
	gomail "gopkg.in/mail.v2"

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

	// decode the file content before calling processFileData
	decodedFileContent, err := base64.StdEncoding.DecodeString(requestBody.File)
	if err != nil {
			c.IndentedJSON(http.StatusBadRequest, gin.H{"error": "Invalid file data"})
			return
	}

	// Pass the decoded file content to processFileData
	err = processFileData(postid, requestBody.ContentType, decodedFileContent)
	if err != nil {
			c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
	}

  // return 200
  c.IndentedJSON(http.StatusOK, gin.H{"code":"200"})
}

func processFileData(postid string, contentType string, fileContent []byte) error {
  // create the temporary file
  file, err := os.CreateTemp("", postid)
  if err != nil {
    return fmt.Errorf("could not create temporary file: %w", err)
  }

  // Write the decoded file content to the temporary file
  if _, err := file.Write(fileContent); err != nil {
    return fmt.Errorf("failed to write to temporary file: %w", err)
  }

  // Check if the data dir exists
  err = checkDataDir() 
  if err != nil {
    return err
  }

  // path construction
  var path = "./data/"

  // Construct the filename based on contentType and postid
  var filename string

  if contentType == "videos" {
    filename = postid + ".mp4"
  } else if contentType == "photos" {
    filename = postid + ".png"
  } else {
    return fmt.Errorf("unsupported content type: %s", contentType)
  }

  // Specify the directory where the file should be saved
  savePath := filepath.Join(path, filename)

  // Copy the temporary file to the desired location
  if err := copyFile(file.Name(), savePath); err != nil {
    return fmt.Errorf("failed to copy temporary file: %w", err)
  }

  // Close the temporary file before deleting it
  if err := file.Close(); err != nil {
    return fmt.Errorf("failed to close temporary file: %w", err)
  }

  // Now attempt to delete the temporary file
  if err := os.Remove(file.Name()); err != nil {
    return fmt.Errorf("failed to delete temporary file: %w", err)
  }

  return nil
}

func checkDataDir() error {
  dataDir := "./data"
  // Check if ./data dir exists, if not create it
  if _, err := os.Stat(dataDir); os.IsNotExist(err) {
		if err := os.Mkdir(dataDir, 0755); err != nil {
			return err
		}
  }
  return nil
}

func copyFile(src, dst string) error {
	// Ensure the destination directory exists
	dstDir := filepath.Dir(dst)
	if _, err := os.Stat(dstDir); os.IsNotExist(err) {
			if err := os.MkdirAll(dstDir, 0755); err != nil {
					return fmt.Errorf("failed to create destination directory: %w", err)
			}
	}

	// Open the source file
	sourceFile, err := os.Open(src)
	if err != nil {
			return err
	}
	defer sourceFile.Close()

	// Create the destination file
	destFile, err := os.Create(dst)
	if err != nil {
			return err
	}
	defer destFile.Close()

	// Copy the file
	if _, err := io.Copy(destFile, sourceFile); err != nil {
			return err
	}

	return nil
}
