package server

import (
	"backend/database"
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

const port = "5432"

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

	router.Run("localhost:8080")
}

type portAndStatus struct {
	Port   string `json:"port"`
	Status int    `json:"status"`
}

var portStatus = []portAndStatus{
	{Port: port, Status: http.StatusOK},
}

func getServerTest(c *gin.Context) {
	c.IndentedJSON(http.StatusOK, portStatus)

	db, err := database.Connect()
	if err != nil {
		panic(err)
	}
	defer db.Close()
}
