package database

import (
    "database/sql"
    "fmt"
    _ "github.com/lib/pq"
)

func Connect() (*sql.DB, error) {
    var (
        host     = "localhost"
        port     = "5432"
        user     = "postgres"
        password = ""
        dbname   = ""
    )

    connString := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
        host, port, user, password, dbname)

    db, err := sql.Open("postgres", connString)
    if err != nil {
        return nil, err
    }

    err = db.Ping()
    if err != nil {
        return nil, err
    }

    return db, nil
}
