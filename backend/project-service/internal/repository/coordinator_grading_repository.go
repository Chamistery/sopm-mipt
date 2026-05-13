package repository

import (
	"context"
	"fmt"

	"github.com/hsse/project-service/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

// CoordinatorGradingRepository — агрегат оценок для view-grading tab
// «Текущие оценки». Каждая колонка таблицы — отдельный AVG по
// sprint_scores.category. КТУ берётся из mentor-строк (только там
// он имеет смысл).
type CoordinatorGradingRepository struct {
	db *pgxpool.Pool
}

func NewCoordinatorGradingRepository(db *pgxpool.Pool) *CoordinatorGradingRepository {
	return &CoordinatorGradingRepository{db: db}
}

// Rows возвращает по одной строке на студента, который состоит в команде
// (есть запись в team_members). Студенты вне команд не показываются.
func (r *CoordinatorGradingRepository) Rows(ctx context.Context) ([]models.CoordinatorGradingRow, error) {
	const q = `
		SELECT
		    u.id AS student_id,
		    TRIM(CONCAT(u.last_name, ' ', LEFT(u.first_name, 1), '.')) AS student_name,
		    p.title AS project_title,
		    t.id   AS team_id,
		    t.name AS team_name,
		    AVG(CASE WHEN ss.category = 'mentor'  THEN ss.score END)::float8 AS mentor_avg,
		    AVG(CASE WHEN ss.category = 'mentor'  THEN ss.ktu   END)::float8 AS ktu_avg,
		    AVG(CASE WHEN ss.category = 'tracker' THEN ss.score END)::float8 AS tracker_avg,
		    AVG(CASE WHEN ss.category = 'defense' THEN ss.score END)::float8 AS defense_avg,
		    AVG(CASE WHEN ss.category = 'peer'    THEN ss.score END)::float8 AS peer_avg
		FROM team_members tm
		JOIN users u   ON u.id = tm.user_id
		JOIN teams t   ON t.id = tm.team_id
		JOIN projects p ON p.id = t.project_id
		LEFT JOIN sprint_scores ss
		    ON ss.student_id = u.id AND ss.team_id = t.id
		GROUP BY u.id, u.last_name, u.first_name, p.title, t.id, t.name
		ORDER BY u.last_name ASC, u.first_name ASC
	`
	rows, err := r.db.Query(ctx, q)
	if err != nil {
		return nil, fmt.Errorf("coord grading: query: %w", err)
	}
	defer rows.Close()

	out := []models.CoordinatorGradingRow{}
	for rows.Next() {
		var (
			row                                                 models.CoordinatorGradingRow
			mentorAvg, ktuAvg, trackerAvg, defenseAvg, peerAvg *float64
		)
		if err := rows.Scan(
			&row.StudentID, &row.StudentName, &row.ProjectTitle, &row.TeamID, &row.TeamName,
			&mentorAvg, &ktuAvg, &trackerAvg, &defenseAvg, &peerAvg,
		); err != nil {
			return nil, fmt.Errorf("coord grading: scan: %w", err)
		}
		row.MentorAvg = mentorAvg
		row.Ktu = ktuAvg
		row.Tracker = trackerAvg
		row.Defense = defenseAvg
		row.PeerReview = peerAvg

		// Итого по формуле Положения о ПП:
		//   0.4 × Ментор × КТУ + 0.3 × Трекер + 0.2 × Защита + 0.1 × Peer.
		// Учитываем только присутствующие компоненты; если ни одной — Total = nil
		// (фронт нарисует «—»). КТУ по умолчанию 1.0, если ментор оценил, но КТУ
		// не выставил.
		var total float64
		anyPresent := false
		if mentorAvg != nil {
			k := 1.0
			if ktuAvg != nil {
				k = *ktuAvg
			}
			total += 0.4 * (*mentorAvg) * k
			anyPresent = true
		}
		if trackerAvg != nil {
			total += 0.3 * (*trackerAvg)
			anyPresent = true
		}
		if defenseAvg != nil {
			total += 0.2 * (*defenseAvg)
			anyPresent = true
		}
		if peerAvg != nil {
			total += 0.1 * (*peerAvg)
			anyPresent = true
		}
		if anyPresent {
			row.Total = &total
		}
		out = append(out, row)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}
