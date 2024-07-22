package main

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
)

func GetPosts(c *gin.Context) {
	db, err := Connect()
	if err != nil {
		panic(err)
	}
	defer db.Close()

	rows, err := db.Query("SELECT * FROM posts LIMIT 2")
	if err != nil {
		panic(err)
	}
	defer rows.Close()

	var posts PostsJSON
	var allPosts []PostsRes
	for rows.Next() {
		err := rows.Scan(&posts.Id, &posts.Parent_id, &posts.Text_content)
		if err != nil {
			panic(err)
		}
		content, extension, err := getFileFromPostID(posts.Id)
		if err != nil {
			panic(err)
		}
		var res PostsRes
		res.Extension = extension
		res.Endcoded_attatchment = base64.StdEncoding.EncodeToString(content)
		res.Text_content = posts.Text_content
		res.Id = posts.Id
		res.Parent_id = posts.Parent_id

		allPosts = append(allPosts, res)
	}

	// bind it to req
	c.IndentedJSON(http.StatusOK, allPosts)
}

func getFileFromPostID(postID string) ([]byte, string, error) {
	basePath := "./data"
	fileExtensions := []string{".mp4", ".png"}

	for _, ext := range fileExtensions {
		filePath := filepath.Join(basePath, postID+ext)
		if _, err := os.Stat(filePath); err == nil {
			content, err := os.ReadFile(filePath)
			if err != nil {
				return nil, "", err
			}
			return content, ext, nil
		}
	}

	return nil, "", fmt.Errorf("file not found for post ID: %s", postID)
}
