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

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	gomail "gopkg.in/mail.v2"
)

func GenerateResetToken() string {
	// create token
	resetToken := make([]byte, 31)
	_, err := rand.Read(resetToken)
	if err != nil {
		panic(err)
	}

	//return token
	return hex.EncodeToString(resetToken)
}

func TokenExpire(resetToken string, timeUntilExpriation time.Duration) error {
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

func AddRestTokenToDatabase(token string, userId string, db *sql.DB) ([]byte, error) {
	_, err := db.Exec("UPDATE USERS SET reset_token = $1 WHERE id = $2", token, userId)
	if err != nil {
		return nil, err
	}
	return nil, nil
}

func SendEmail(token string, toEmail string, c *gin.Context) {
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

func ProcessPostAttachmentData(postid string, contentType string, fileContent []byte) error {
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
  err = CheckDataDir() 
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
  if err := CopyFile(file.Name(), savePath); err != nil {
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

func CheckDataDir() error {
  dataDir := "./data"
  // Check if ./data dir exists, if not create it
  if _, err := os.Stat(dataDir); os.IsNotExist(err) {
		if err := os.Mkdir(dataDir, 0755); err != nil {
			return err
		}
  }
  return nil
}

func CopyFile(src, dst string) error {
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
