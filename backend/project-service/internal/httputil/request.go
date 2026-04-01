package httputil

import (
	"net/http"
	"strconv"
)

func ParsePathInt(r *http.Request, key string) (int, error) {
	str := r.PathValue(key)
	if str == "" {
		return 0, &ValidationError{Field: key, Message: "is required"}
	}

	val, err := strconv.Atoi(str)
	if err != nil {
		return 0, &ValidationError{Field: key, Message: "must be a valid integer"}
	}

	return val, nil
}

func ParsePathString(r *http.Request, key string) (string, error) {
	str := r.PathValue(key)
	if str == "" {
		return "", &ValidationError{Field: key, Message: "is required"}
	}

	return str, nil
}

func ParseQueryInt(r *http.Request, key string, defaultValue int) int {
	str := r.URL.Query().Get(key)
	if str == "" {
		return defaultValue
	}

	val, err := strconv.Atoi(str)
	if err != nil {
		return defaultValue
	}

	return val
}

func ParseQueryString(r *http.Request, key string) string {
	return r.URL.Query().Get(key)
}

type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return e.Field + " " + e.Message
}
