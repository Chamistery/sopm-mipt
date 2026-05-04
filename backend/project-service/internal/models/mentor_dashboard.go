package models

// MentorDashboardProject is the aggregated DTO returned by GET
// /api/mentor/dashboard. It mirrors what the static prototype shows in
// `mentor.html` view-dashboard:
//   - title + status + predecessorId
//   - duration semesters and current semester (continuation badge)
//   - sprint header (current sprint + total + week length)
//   - per-team rows with leader, member count, launched flag and the
//     iter-track squares (one status per sprint).
//
// We intentionally keep this close to the UI shape — the dashboard is a
// read-only aggregate, computed once per request, so the cost of a
// dedicated DTO is offset by the simplicity of the React component.
type MentorDashboardProject struct {
	ID                int                `json:"id"`
	Title             string             `json:"title"`
	Status            ProjectStatus      `json:"status"`
	Company           string             `json:"company"`
	PredecessorID     *int               `json:"predecessorId,omitempty"`
	DurationSemesters int                `json:"durationSemesters"`
	CurrentSemester   int                `json:"currentSemester"`
	StartedAt         string             `json:"startedAt,omitempty"`
	Sprints           []DashboardSprint  `json:"sprints"`
	Teams             []DashboardTeam    `json:"teams"`
}

// DashboardSprint is a sprint row trimmed for the dashboard. Frontend uses
// it to render the synthetic «Спринт K из M · по W недели · DD ммм — DD ммм»
// header — only the first/active sprint is highlighted, but we send all of
// them so the component can compute current/total in one place.
type DashboardSprint struct {
	ID        int          `json:"id"`
	Number    int          `json:"number"`
	StartDate string       `json:"startDate"`
	EndDate   string       `json:"endDate"`
	Status    SprintStatus `json:"status"`
}

// DashboardTeam — one row in the project card. `Launched=false` means the
// team is formed but its sprint work hasn't started — UI shows a dashed
// placeholder linking to the distribution page.
//
// `SprintStatuses` is per-sprint, in the same order as the project's
// sprints array. Values:
//   - "reviewed":       team report for that sprint is reviewed
//   - "pending-review": team report submitted, mentor hasn't reviewed yet
//   - "missed":         sprint ended with no submitted report
//   - "current":        the active sprint
//   - "future":         sprint hasn't started yet
type DashboardTeam struct {
	ID             int                  `json:"id"`
	Name           string               `json:"name"`
	Lead           *UserSummary         `json:"lead,omitempty"`
	MemberCount    int                  `json:"memberCount"`
	Launched       bool                 `json:"launched"`
	SprintStatuses []DashboardIterState `json:"sprintStatuses"`
}

type DashboardIterState string

const (
	DashboardIterReviewed      DashboardIterState = "reviewed"
	DashboardIterPendingReview DashboardIterState = "pending-review"
	DashboardIterMissed        DashboardIterState = "missed"
	DashboardIterCurrent       DashboardIterState = "current"
	DashboardIterFuture        DashboardIterState = "future"
)
