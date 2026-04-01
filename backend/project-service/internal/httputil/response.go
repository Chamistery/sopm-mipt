package httputil

import (
	"encoding/json"
	"log"
	"net/http"
)

type ErrorResponse struct {
	Error string `json:"error"`
}

type SuccessResponse struct {
	Data interface{} `json:"data"`
}

func RespondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("Error encoding JSON response: %v", err)
	}
}

func RespondError(w http.ResponseWriter, status int, message string) {
	RespondJSON(w, status, ErrorResponse{Error: message})
}

func RespondSuccess(w http.ResponseWriter, status int, data interface{}) {
	RespondJSON(w, status, SuccessResponse{Data: data})
}
