package models

// CoordinatorGradingResponse — агрегат оценок по всем студентам в одной
// большой таблице. Pixel-port из admin.html view-grading tab «Текущие
// оценки» (lines 1847-1955).
type CoordinatorGradingResponse struct {
	Rows []CoordinatorGradingRow `json:"rows"`
}

// CoordinatorGradingRow — одна строка таблицы оценивания.
// MentorAvg / Tracker / Defense — средние значения по соответствующим
// источникам (sprint_scores + защита). Если данных нет — nil.
type CoordinatorGradingRow struct {
	StudentID    int      `json:"studentId"`
	StudentName  string   `json:"studentName"`
	ProjectTitle string   `json:"projectTitle,omitempty"`
	TeamName     string   `json:"teamName,omitempty"`
	MentorAvg    *float64 `json:"mentorAvg,omitempty"`
	Ktu          *float64 `json:"ktu,omitempty"`
	Tracker      *float64 `json:"tracker,omitempty"`
	Defense      *float64 `json:"defense,omitempty"`
	PeerReview   *float64 `json:"peerReview,omitempty"`
	Total        *float64 `json:"total,omitempty"`
}
