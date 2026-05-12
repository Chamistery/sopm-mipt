package models

// CoordinatorDashboardResponse — агрегат для GET /api/coordinator/dashboard.
// Pixel-port из admin.html (view-dashboard, lines 803-983):
//   - stats: 3 числовых карточки (Активных проектов / Команд / Студентов)
//   - attention: 2 алёрта (заявки + нераспределённые студенты)
//   - projects: тот же шейп что у MentorDashboardProject, но без фильтра
//     по mentor_id и с заполненным mentor-полем для отображения в meta.
type CoordinatorDashboardResponse struct {
	Stats     CoordinatorDashboardStats     `json:"stats"`
	Attention CoordinatorDashboardAttention `json:"attention"`
	Projects  []MentorDashboardProject      `json:"projects"`
}

// CoordinatorDashboardStats — числа в верхней «stats-row» полосе.
type CoordinatorDashboardStats struct {
	ActiveProjects int `json:"activeProjects"`
	Teams          int `json:"teams"`
	Students       int `json:"students"`
}

// CoordinatorDashboardAttention — счётчики для «Требует внимания».
// PendingApplications — все ожидающие утверждения заявки (новые проекты
// status='На утверждении' + change-requests с pending_proposal_data).
// UnassignedStudents — студенты с поданной заявкой, не попавшие ни в одну
// команду.
type CoordinatorDashboardAttention struct {
	PendingApplications int `json:"pendingApplications"`
	UnassignedStudents  int `json:"unassignedStudents"`
}
