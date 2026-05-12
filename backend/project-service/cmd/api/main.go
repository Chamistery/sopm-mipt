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
	"github.com/hsse/project-service/internal/service"
)

func setupRoutes(
	mux *http.ServeMux,
	projectHandler *handlers.ProjectHandler,
	applicationHandler *handlers.ApplicationHandler,
	userHandler *handlers.UserHandler,
	teamHandler *handlers.TeamHandler,
	sprintHandler *handlers.SprintHandler,
	taskHandler *handlers.TaskHandler,
	teamReportHandler *handlers.TeamReportHandler,
	sprintScoreHandler *handlers.SprintScoreHandler,
	meetingHandler *handlers.MeetingHandler,
	distributionHandler *handlers.DistributionHandler,
	mentorDashboardHandler *handlers.MentorDashboardHandler,
	mentorDistributionHandler *handlers.MentorDistributionHandler,
	coordinatorDashboardHandler *handlers.CoordinatorDashboardHandler,
	coordinatorDistributionHandler *handlers.CoordinatorDistributionHandler,
	coordinatorApplicationsHandler *handlers.CoordinatorApplicationsHandler,
) {
	mux.HandleFunc("POST /api/projects", projectHandler.Create)
	mux.HandleFunc("GET /api/projects", projectHandler.GetList)
	mux.HandleFunc("GET /api/mentor/dashboard", mentorDashboardHandler.Get)
	mux.HandleFunc("GET /api/mentor/distribution", mentorDistributionHandler.Get)
	mux.HandleFunc("GET /api/coordinator/dashboard", coordinatorDashboardHandler.Get)
	mux.HandleFunc("GET /api/coordinator/distribution", coordinatorDistributionHandler.Get)
	mux.HandleFunc("GET /api/coordinator/applications", coordinatorApplicationsHandler.Get)
	mux.HandleFunc("GET /api/mentor/projects/archive", projectHandler.GetMentorArchive)
	mux.HandleFunc("GET /api/projects/{id}", projectHandler.GetByID)
	mux.HandleFunc("GET /api/projects/{id}/full", projectHandler.GetFull)
	mux.HandleFunc("GET /api/projects/{id}/applicants", projectHandler.GetApplicants)
	mux.HandleFunc("GET /api/projects/{id}/predecessor", projectHandler.GetPredecessor)
	mux.HandleFunc("GET /api/projects/{id}/proposal", projectHandler.GetProposal)
	mux.HandleFunc("PUT /api/projects/{id}", projectHandler.Update)
	mux.HandleFunc("POST /api/projects/{id}/change-request", projectHandler.SubmitChangeRequest)
	mux.HandleFunc("POST /api/projects/{id}/change-request/approve", projectHandler.ApproveChangeRequest)
	mux.HandleFunc("POST /api/projects/{id}/change-request/reject", projectHandler.RejectChangeRequest)
	mux.HandleFunc("DELETE /api/projects/{id}", projectHandler.Delete)

	mux.HandleFunc("POST /api/applications", applicationHandler.Create)
	mux.HandleFunc("GET /api/applications", applicationHandler.GetByStudentID)
	mux.HandleFunc("GET /api/applications/project", applicationHandler.GetByProjectID)
	mux.HandleFunc("GET /api/applications/{id}", applicationHandler.GetByID)
	mux.HandleFunc("PUT /api/applications/{id}/recommend", applicationHandler.Recommend)
	mux.HandleFunc("PUT /api/applications/{id}/unrecommend", applicationHandler.Unrecommend)
	mux.HandleFunc("PUT /api/applications/{id}/move-team", applicationHandler.MoveToTeam)
	mux.HandleFunc("PUT /api/applications/{id}/invite", applicationHandler.Invite)
	mux.HandleFunc("PUT /api/applications/{id}/accept", applicationHandler.Accept)
	mux.HandleFunc("PUT /api/applications/{id}/decline", applicationHandler.Decline)
	mux.HandleFunc("PUT /api/applications/{id}/exclude", applicationHandler.Exclude)
	mux.HandleFunc("DELETE /api/applications/{id}", applicationHandler.Delete)

	mux.HandleFunc("POST /api/users", userHandler.Create)
	mux.HandleFunc("GET /api/users", userHandler.GetAll)
	mux.HandleFunc("GET /api/users/{id}", userHandler.GetByID)
	mux.HandleFunc("GET /api/users/{id}/team", userHandler.GetTeam)
	mux.HandleFunc("GET /api/users/{id}/profile", userHandler.GetProfile)
	mux.HandleFunc("PUT /api/users/{id}/profile", userHandler.UpdateProfile)
	mux.HandleFunc("POST /api/users/{id}/files", userHandler.UploadFile)
	mux.HandleFunc("GET /api/users/{id}/files", userHandler.ListFiles)
	mux.HandleFunc("DELETE /api/users/{id}/files/{fileId}", userHandler.DeleteFile)
	mux.HandleFunc("GET /api/users/{id}/notifications", userHandler.Notifications)

	mux.HandleFunc("POST /api/teams", teamHandler.Create)
	mux.HandleFunc("GET /api/teams", teamHandler.GetList)
	mux.HandleFunc("GET /api/teams/{id}", teamHandler.GetByID)
	mux.HandleFunc("PUT /api/teams/{id}", teamHandler.Update)
	mux.HandleFunc("POST /api/teams/{id}/launch", teamHandler.Launch)
	mux.HandleFunc("POST /api/teams/{id}/leader", teamHandler.SetLeader)
	mux.HandleFunc("DELETE /api/teams/{id}", teamHandler.Delete)
	mux.HandleFunc("POST /api/teams/{id}/members", teamHandler.AddMember)
	mux.HandleFunc("DELETE /api/teams/{teamId}/members/{userId}", teamHandler.RemoveMember)
	mux.HandleFunc("GET /api/teams/{id}/gantt", taskHandler.Gantt)

	mux.HandleFunc("POST /api/sprints", sprintHandler.Create)
	mux.HandleFunc("POST /api/sprints/batch", sprintHandler.CreateBatch)
	mux.HandleFunc("GET /api/sprints", sprintHandler.GetList)
	mux.HandleFunc("GET /api/sprints/{id}", sprintHandler.GetByID)
	mux.HandleFunc("PUT /api/sprints/{id}", sprintHandler.Update)

	mux.HandleFunc("POST /api/tasks", taskHandler.Create)
	mux.HandleFunc("GET /api/tasks", taskHandler.GetList)
	mux.HandleFunc("GET /api/tasks/{id}", taskHandler.GetByID)
	mux.HandleFunc("PUT /api/tasks/{id}", taskHandler.Update)
	mux.HandleFunc("PUT /api/tasks/{id}/approve", taskHandler.Approve)
	mux.HandleFunc("PUT /api/tasks/{id}/reject", taskHandler.Reject)
	mux.HandleFunc("PUT /api/tasks/{id}/submit-review", taskHandler.SubmitReview)
	mux.HandleFunc("PUT /api/tasks/{id}/accept", taskHandler.Accept)
	mux.HandleFunc("PUT /api/tasks/{id}/return", taskHandler.Return)
	mux.HandleFunc("DELETE /api/tasks/{id}", taskHandler.Delete)

	mux.HandleFunc("POST /api/team-reports", teamReportHandler.Create)
	mux.HandleFunc("GET /api/team-reports", teamReportHandler.GetList)
	mux.HandleFunc("PUT /api/team-reports/{id}", teamReportHandler.Update)
	mux.HandleFunc("PUT /api/team-reports/{id}/review", teamReportHandler.Review)

	mux.HandleFunc("POST /api/sprint-scores", sprintScoreHandler.Create)
	mux.HandleFunc("GET /api/sprint-scores", sprintScoreHandler.GetList)
	mux.HandleFunc("PUT /api/sprint-scores/{id}", sprintScoreHandler.Update)

	mux.HandleFunc("POST /api/meetings", meetingHandler.Create)
	mux.HandleFunc("GET /api/meetings", meetingHandler.GetList)
	mux.HandleFunc("PUT /api/meetings/{id}", meetingHandler.Update)
	mux.HandleFunc("DELETE /api/meetings/{id}", meetingHandler.Delete)

	mux.HandleFunc("POST /api/distribution/generate", distributionHandler.Generate)
	mux.HandleFunc("GET /api/distribution/status", distributionHandler.Status)

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
	projectRepo := repository.NewProjectRepository(db.Pool)
	applicationRepo := repository.NewApplicationRepository(db.Pool)
	userRepo := repository.NewUserRepository(db.Pool)
	teamRepo := repository.NewTeamRepository(db.Pool)
	sprintRepo := repository.NewSprintRepository(db.Pool)
	taskRepo := repository.NewTaskRepository(db.Pool)
	teamReportRepo := repository.NewTeamReportRepository(db.Pool)
	sprintScoreRepo := repository.NewSprintScoreRepository(db.Pool)
	meetingRepo := repository.NewMeetingRepository(db.Pool)
	userProfileRepo := repository.NewUserProfileRepository(db.Pool)
	userFileRepo := repository.NewUserFileRepository(db.Pool)

	applicationService := service.NewApplicationService(
		applicationRepo,
		projectRepo,
		userRepo,
		teamRepo,
		cfg.App.MaxApplicationChoices,
	)
	taskService := service.NewTaskService(taskRepo, sprintRepo, teamRepo, projectRepo)
	notificationService := service.NewNotificationService(db.Pool, userProfileRepo)
	distributionService := service.NewDistributionService(projectRepo, applicationRepo, teamRepo)
	fileStorage := service.NewLocalFileStorage(cfg.App.StorageDir)

	projectHandler := handlers.NewProjectHandler(projectRepo)
	applicationHandler := handlers.NewApplicationHandler(applicationRepo, applicationService)
	userHandler := handlers.NewUserHandler(userRepo, userProfileRepo, userFileRepo, notificationService, fileStorage, cfg.App.MaxUploadBytes)
	teamHandler := handlers.NewTeamHandler(teamRepo, projectRepo)
	sprintHandler := handlers.NewSprintHandler(sprintRepo)
	taskHandler := handlers.NewTaskHandler(taskService, teamRepo, sprintRepo)
	teamReportHandler := handlers.NewTeamReportHandler(teamReportRepo)
	sprintScoreHandler := handlers.NewSprintScoreHandler(sprintScoreRepo)
	meetingHandler := handlers.NewMeetingHandler(meetingRepo, teamRepo, projectRepo)
	distributionHandler := handlers.NewDistributionHandler(distributionService)
	mentorDashboardRepo := repository.NewMentorDashboardRepository(db.Pool)
	mentorDashboardHandler := handlers.NewMentorDashboardHandler(mentorDashboardRepo)
	mentorDistributionRepo := repository.NewMentorDistributionRepository(db.Pool)
	mentorDistributionHandler := handlers.NewMentorDistributionHandler(mentorDistributionRepo)
	coordinatorDashboardRepo := repository.NewCoordinatorDashboardRepository(db.Pool)
	coordinatorDashboardHandler := handlers.NewCoordinatorDashboardHandler(coordinatorDashboardRepo, mentorDashboardRepo)
	coordinatorDistributionRepo := repository.NewCoordinatorDistributionRepository(db.Pool)
	coordinatorDistributionHandler := handlers.NewCoordinatorDistributionHandler(coordinatorDistributionRepo)
	coordinatorApplicationsRepo := repository.NewCoordinatorApplicationsRepository(db.Pool)
	coordinatorApplicationsHandler := handlers.NewCoordinatorApplicationsHandler(coordinatorApplicationsRepo)
	mux := http.NewServeMux()
	setupRoutes(
		mux,
		projectHandler,
		applicationHandler,
		userHandler,
		teamHandler,
		sprintHandler,
		taskHandler,
		teamReportHandler,
		sprintScoreHandler,
		meetingHandler,
		distributionHandler,
		mentorDashboardHandler,
		mentorDistributionHandler,
		coordinatorDashboardHandler,
		coordinatorDistributionHandler,
		coordinatorApplicationsHandler,
	)
	handler := middleware.Logger(middleware.AuthContext(middleware.CORS(mux)))
	addr := cfg.Server.Host + ":" + cfg.Server.Port
	server := createServer(addr, handler)
	log.Printf("Starting server on %s", addr)

	if err := server.ListenAndServe(); err != nil {
		log.Printf("Server failed to start: %v", err)
		return
	}
}
