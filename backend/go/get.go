package main

import (
	"net/http"

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
		var res PostsRes
		res.Text_content = posts.Text_content
		res.Id = posts.Id
		res.Parent_id = posts.Parent_id

		allPosts = append(allPosts, res)
	}

	// bind it to req
	c.IndentedJSON(http.StatusOK, allPosts)
}

