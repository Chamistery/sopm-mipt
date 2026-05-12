package models

// MentorDistributionResponse — агрегированный DTO для GET /api/mentor/distribution.
// Возвращает все проекты ментора, у которых есть незапущенные команды (launched=false)
// или непринятые заявки. Каждый проект содержит мета, команды и пул заявок.
//
// Используется страницей mentor.html view-distribution: drag&drop студентов между
// пулом и слотами незапущенных команд + кнопка «Запустить команду».
type MentorDistributionResponse struct {
	Projects []MentorDistributionProject `json:"projects"`
}

type MentorDistributionProject struct {
	ID                 int                              `json:"id"`
	Title              string                           `json:"title"`
	Status             ProjectStatus                    `json:"status"`
	Company            string                           `json:"company"`
	TeamSizeMin        int                              `json:"teamSizeMin"`
	TeamSizeMax        int                              `json:"teamSizeMax"`
	NumTeams           int                              `json:"numTeams"`
	SprintsCount       int                              `json:"sprintsCount"`
	SprintWeeks        int                              `json:"sprintWeeks"`
	Deadline           string                           `json:"deadline,omitempty"`
	Requirements       ApplicantRequirements            `json:"requirements"`
	Teams              []MentorDistributionTeam         `json:"teams"`
	Pool               MentorDistributionPool           `json:"pool"`
}

type MentorDistributionTeam struct {
	ID       int                            `json:"id"`
	Name     string                         `json:"name"`
	Launched bool                           `json:"launched"`
	Members  []MentorDistributionTeamMember `json:"members"`
}

type MentorDistributionTeamMember struct {
	ApplicationID int               `json:"applicationId"`
	StudentID     int               `json:"studentId"`
	FirstName     string            `json:"firstName"`
	LastName      string            `json:"lastName"`
	Course        int               `json:"course"`
	Group         string            `json:"group"`
	GPA           float64           `json:"gpa"`
	Priority      int               `json:"priority"`
	Status        ApplicationStatus `json:"status"`
	Qualified     bool              `json:"qualified"`
	// AllPriorities — все заявки этого студента (нужно для drawer'а в admin
	// distribution: видеть, какие проекты он указывал в каком приоритете).
	// На менторском distribution не заполняется (omitempty).
	AllPriorities []TeamMemberPriority `json:"allPriorities,omitempty"`
}

// TeamMemberPriority — лёгкая запись о другой заявке этого студента.
type TeamMemberPriority struct {
	ApplicationID int               `json:"applicationId"`
	ProjectID     int               `json:"projectId"`
	ProjectTitle  string            `json:"projectTitle"`
	Priority      int               `json:"priority"`
	Status        ApplicationStatus `json:"status"`
}

type MentorDistributionPool struct {
	Qualified   ApplicantPriorityBuckets `json:"qualified"`
	Unqualified ApplicantPriorityBuckets `json:"unqualified"`
}
