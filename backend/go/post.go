package main

import (
	"crypto/rand"
	"database/sql"
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


func PostPosts(c *gin.Context) {
	
	type RequestBody struct {
    ParentId     string `json:"id"`
    TextContent  string `json:"text"`
    ContentType  string `json:"type"`
	}

	
	var requestBody RequestBody
	
	if err := c.BindJSON(&requestBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if requestBody.ContentType != "photo" && requestBody.ContentType != "video" {
		c.IndentedJSON(http.StatusBadRequest, gin.H{"error": "unsupported file type"})
	}
	
	//connect to the database
	db, err := Connect()
	if err != nil {
		c.IndentedJSON(http.StatusInternalServerError, gin.H{})
		return
	}
	defer db.Close()

	//insert, return id
	var postid string

	err = db.QueryRow("INSERT INTO posts (parent_id, text_content) VALUES ($1, $2) RETURNING id", requestBody.ParentId, requestBody.TextContent).Scan(&postid)
	if err != nil {
		c.IndentedJSON(http.StatusInternalServerError, gin.H{})
		return
	}

	// get file from req
	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.IndentedJSON(http.StatusBadRequest, gin.H{"error": "Could not get uploaded file"})
		return
	}
	
	// open file from req
	file, err := fileHeader.Open()
	if err != nil {
		c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": "Could not open the file"})
		return
	}
	defer file.Close()
	
	// Extract the file extension from the original file name
	fileExt := filepath.Ext(fileHeader.Filename)

	// Generate new file name using postid and original file extension
	fileName := postid + fileExt

	// Check if the data and sub dirs exist
	err = checkDataDir(requestBody.ParentId, requestBody.ContentType)
	if err != nil {
		panic(err)
	}

	var path = "./data/" + requestBody.ParentId + "/" + requestBody.ContentType

	// Specify the directory where the file should be saved, adjust the path as needed
	savePath := filepath.Join(path, fileName)
	// Create a new file in the desired directory
	outFile, err := os.Create(savePath)
	if err != nil {
			c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": "Could not create a file on the server"})
			return
	}
	defer outFile.Close()

	// Copy the contents of the uploaded file to the new file
	_, err = io.Copy(outFile, file)
	if err != nil {
			c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": "Failed to save the file"})
			return
	}

	// return 200
	c.IndentedJSON(http.StatusOK, gin.H{})
}


func checkDataDir(id string, fileType string) error {
	dataDir := "./data"
	parentDir := filepath.Join(dataDir, id)
	var fileTypeDir string

	// Check if ./data dir exists, if not create it
	if _, err := os.Stat(dataDir); os.IsNotExist(err) {
			if err := os.Mkdir(dataDir, 0755); err != nil {
					return fmt.Errorf("failed to create data directory: %w", err)
			}
	}

	// Check if ./data/requestBody.id dir exists, if not create it
	if _, err := os.Stat(parentDir); os.IsNotExist(err) {
			if err := os.Mkdir(parentDir, 0755); err != nil {
					return fmt.Errorf("failed to create parent directory: %w", err)
			}
	}

	// Determine the type of directory to check/create based on fileType
	switch fileType {
	case "video":
			fileTypeDir = filepath.Join(parentDir, "video")
	case "photo":
			fileTypeDir = filepath.Join(parentDir, "photo")
	default:
			return fmt.Errorf("unsupported file type: %s", fileType)
	}

	// Check if ./data/requestBody.id/fileType dir exists, if not create it
	if _, err := os.Stat(fileTypeDir); os.IsNotExist(err) {
			if err := os.Mkdir(fileTypeDir, 0755); err != nil {
					return fmt.Errorf("failed to create fileType directory: %w", err)
			}
	}

	return nil
}