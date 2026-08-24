package main

import (
	"log"
	"net/http"
)

func main() {
	// Serve static files from the React frontend build directory
	fs := http.FileServer(http.Dir("./frontend/dist"))
	http.Handle("/", fs)

	log.Println("Server listening on http://localhost:8080")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Fatal(err)
	}
}
