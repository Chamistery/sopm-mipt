package main

import (
	"log"
	"net/http"
	"time"

	"github.com/hsse/project-service/internal/config"
	"github.com/hsse/project-service/internal/database"
	"github.com/hsse/project-service/internal/handlers"
	"github.com/hsse/project-service/internal/middleware"
	"github.com/hsse/project-service/internal/repository"
)

func setupRoutes(
	mux *http.ServeMux,
	templateHandler *handlers.TemplateHandler,
	projectHandler *handlers.ProjectHandler,
	applicationHandler *handlers.ApplicationHandler,
	userHandler *handlers.UserHandler,
) {
	mux.HandleFunc("POST /api/templates", templateHandler.Create)
	mux.HandleFunc("GET /api/templates", templateHandler.GetAll)
	mux.HandleFunc("GET /api/templates/{id}", templateHandler.GetByID)
	mux.HandleFunc("PUT /api/templates/{id}", templateHandler.Update)
	mux.HandleFunc("DELETE /api/templates/{id}", templateHandler.Delete)

	mux.HandleFunc("POST /api/projects", projectHandler.Create)
	mux.HandleFunc("GET /api/projects", projectHandler.GetList)
	mux.HandleFunc("GET /api/projects/{id}", projectHandler.GetByID)
	mux.HandleFunc("PUT /api/projects/{id}", projectHandler.Update)
	mux.HandleFunc("DELETE /api/projects/{id}", projectHandler.Delete)

	mux.HandleFunc("POST /api/applications", applicationHandler.Create)
	mux.HandleFunc("GET /api/applications", applicationHandler.GetByStudentID)
	mux.HandleFunc("GET /api/applications/project", applicationHandler.GetByProjectID)
	mux.HandleFunc("PUT /api/applications/{id}", applicationHandler.Update)
	mux.HandleFunc("PUT /api/applications/priorities", applicationHandler.UpdatePriorities)
	mux.HandleFunc("DELETE /api/applications/{id}", applicationHandler.Delete)

	mux.HandleFunc("POST /api/users", userHandler.Create)
	mux.HandleFunc("GET /api/users", userHandler.GetAll)
	mux.HandleFunc("GET /api/users/{id}", userHandler.GetByID)

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)

		if _, err := w.Write([]byte("OK")); err != nil {
			log.Printf("Error writing health check response: %v", err)
		}
	})
}

func createServer(addr string, handler http.Handler) *http.Server {
	return &http.Server{
		Addr:         addr,
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}
}

func main() {
	cfg := config.Load()

	db, err := database.New(cfg.Database.DSN())
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	defer db.Close()
	templateRepo := repository.NewTemplateRepository(db.Pool)
	projectRepo := repository.NewProjectRepository(db.Pool)
	applicationRepo := repository.NewApplicationRepository(db.Pool)
	userRepo := repository.NewUserRepository(db.Pool)
	templateHandler := handlers.NewTemplateHandler(templateRepo)
	projectHandler := handlers.NewProjectHandler(projectRepo)
	applicationHandler := handlers.NewApplicationHandler(applicationRepo)
	userHandler := handlers.NewUserHandler(userRepo)
	mux := http.NewServeMux()
	setupRoutes(mux, templateHandler, projectHandler, applicationHandler, userHandler)
	handler := middleware.Logger(middleware.CORS(mux))
	addr := cfg.Server.Host + ":" + cfg.Server.Port
	server := createServer(addr, handler)
	log.Printf("Starting server on %s", addr)

	if err := server.ListenAndServe(); err != nil {
		log.Printf("Server failed to start: %v", err)
		return
	}
}
