package server

import (
	"backend/database"
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func Run() {
	router := gin.Default()
	CORSMiddleware := func() gin.HandlerFunc {
		return cors.New(cors.Config{
			AllowOrigins: []string{"http://localhost:3000"},
			AllowMethods: []string{"GET"},
			AllowHeaders: []string{"Content-Type", "Authorization"},
		})
	}

	router.Use(CORSMiddleware())
	router.GET("/test", getServerTest)
	router.GET("/database", getDataBase)

	router.Run("localhost:8080")
}

type portAndStatus struct {
	Port   string `json:"port"`
	Status int    `json:"status"`
}

var portStatus = []portAndStatus{
	{Port: "8000", Status: http.StatusOK},
}

func getServerTest(c *gin.Context) {
	c.IndentedJSON(http.StatusOK, portStatus)
}

type usersSchema struct {
	Id       int    `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
}

func getDataBase(c *gin.Context) {
	db, err := database.Connect()
	if err != nil {
		panic(err)
	}
	defer db.Close()

	rows, err := db.Query("SELECT * FROM users")
	if err != nil {
		panic(err)
	}

	for rows.Next() {
		var id int
		var username string
		var email string

		err := rows.Scan(&id, &username, &email)
		if err != nil {
			panic(err)
		}

		var data = []usersSchema{
			{
				Id:       id,
				Username: username,
				Email:    email,
			},
		}

		c.IndentedJSON(http.StatusOK, data)
	}
}
