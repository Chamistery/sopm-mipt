package models

// CoordinatorDistributionResponse — агрегат для GET /api/coordinator/distribution
// (admin.html view-distribution). Координатор видит ВСЕ активные проекты с
// командами и общий пул нераспределённых студентов.
//
// Отличия от MentorDistributionResponse:
//   - проекты не фильтруются по mentor_id
//   - возвращаются ВСЕ команды (как launched, так и нет), потому что
//     координатор может перемещать студентов и в запущенные команды (для
//     edge case переназначения)
//   - пул один общий, а не по-проектный — admin.html показывает
//     «Нераспределённые (N)» с плоским списком
type CoordinatorDistributionResponse struct {
	Deadline string                          `json:"deadline,omitempty"`
	Projects []CoordinatorDistributionProject `json:"projects"`
	Pool     []CoordinatorPoolStudent         `json:"pool"`
}

type CoordinatorDistributionProject struct {
	ID          int                            `json:"id"`
	Title       string                         `json:"title"`
	Status      ProjectStatus                  `json:"status"`
	Company     string                         `json:"company"`
	Mentor      *UserSummary                   `json:"mentor,omitempty"`
	TeamSizeMin int                            `json:"teamSizeMin"`
	TeamSizeMax int                            `json:"teamSizeMax"`
	NumTeams    int                            `json:"numTeams"`
	Teams       []MentorDistributionTeam       `json:"teams"`
}

// CoordinatorPoolStudent — чип в боковой панели «Нераспределённые». Включает
// все приоритеты студента, чтобы в drawer'е можно было их показать.
type CoordinatorPoolStudent struct {
	StudentID  int                       `json:"studentId"`
	FirstName  string                    `json:"firstName"`
	LastName   string                    `json:"lastName"`
	Course     int                       `json:"course"`
	Group      string                    `json:"group"`
	GPA        float64                   `json:"gpa"`
	Priorities []CoordinatorPoolPriority `json:"priorities"`
}

type CoordinatorPoolPriority struct {
	ApplicationID int               `json:"applicationId"`
	ProjectID     int               `json:"projectId"`
	ProjectTitle  string            `json:"projectTitle"`
	Priority      int               `json:"priority"`
	Status        ApplicationStatus `json:"status"`
}
