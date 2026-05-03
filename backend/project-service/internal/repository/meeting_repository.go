package repository

import (
	"context"

	"github.com/hsse/project-service/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type MeetingRepository struct {
	db *pgxpool.Pool
}

func NewMeetingRepository(db *pgxpool.Pool) *MeetingRepository {
	return &MeetingRepository{db: db}
}

func (r *MeetingRepository) Create(ctx context.Context, meeting *models.Meeting) error {
	query := `
		INSERT INTO meetings (
			team_id, sprint_id, title, description, meeting_date, start_time,
			duration_minutes, conference_link, created_by_id, mentor_confirmed,
			mentor_decline_reason, confirmed_at, summary, status
		) VALUES ($1,$2,$3,$4,$5::date,$6::time,$7,$8,$9,$10,$11,$12,$13,$14)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRow(
		ctx,
		query,
		meeting.TeamID, meeting.SprintID, meeting.Title, meeting.Description, meeting.MeetingDate, meeting.StartTime,
		meeting.DurationMinutes, meeting.ConferenceLink, meeting.CreatedByID, meeting.MentorConfirmed,
		meeting.MentorDeclineReason, meeting.ConfirmedAt, meeting.Summary, meeting.Status,
	).Scan(&meeting.ID, &meeting.CreatedAt, &meeting.UpdatedAt)
}

func (r *MeetingRepository) GetByID(ctx context.Context, id int) (*models.Meeting, error) {
	query := `
		SELECT id, team_id, sprint_id, title, COALESCE(description,''), to_char(meeting_date, 'YYYY-MM-DD'),
		       to_char(start_time, 'HH24:MI'), duration_minutes, COALESCE(conference_link,''), created_by_id,
		       mentor_confirmed, COALESCE(mentor_decline_reason,''), confirmed_at, COALESCE(summary,''), status,
		       created_at, updated_at
		FROM meetings WHERE id = $1
	`
	meeting := &models.Meeting{}
	scanFunc := func(s Scanner) error {
		return s.Scan(&meeting.ID, &meeting.TeamID, &meeting.SprintID, &meeting.Title, &meeting.Description, &meeting.MeetingDate, &meeting.StartTime, &meeting.DurationMinutes, &meeting.ConferenceLink, &meeting.CreatedByID, &meeting.MentorConfirmed, &meeting.MentorDeclineReason, &meeting.ConfirmedAt, &meeting.Summary, &meeting.Status, &meeting.CreatedAt, &meeting.UpdatedAt)
	}
	if err := ScanOne(r.db.QueryRow(ctx, query, id), scanFunc, "meeting"); err != nil {
		return nil, err
	}
	return meeting, nil
}

func (r *MeetingRepository) GetByTeamID(ctx context.Context, teamID int, upcomingOnly bool) ([]models.Meeting, error) {
	query := `
		SELECT id, team_id, sprint_id, title, COALESCE(description,''), to_char(meeting_date, 'YYYY-MM-DD'),
		       to_char(start_time, 'HH24:MI'), duration_minutes, COALESCE(conference_link,''), created_by_id,
		       mentor_confirmed, COALESCE(mentor_decline_reason,''), confirmed_at, COALESCE(summary,''), status,
		       created_at, updated_at
		FROM meetings WHERE team_id = $1
	`
	if upcomingOnly {
		query += ` AND meeting_date >= CURRENT_DATE`
	}
	query += ` ORDER BY meeting_date, start_time`

	scanFunc := func(s Scanner) (models.Meeting, error) {
		var meeting models.Meeting
		err := s.Scan(&meeting.ID, &meeting.TeamID, &meeting.SprintID, &meeting.Title, &meeting.Description, &meeting.MeetingDate, &meeting.StartTime, &meeting.DurationMinutes, &meeting.ConferenceLink, &meeting.CreatedByID, &meeting.MentorConfirmed, &meeting.MentorDeclineReason, &meeting.ConfirmedAt, &meeting.Summary, &meeting.Status, &meeting.CreatedAt, &meeting.UpdatedAt)
		return meeting, err
	}

	return ScanAll(ctx, r.db, query, []interface{}{teamID}, scanFunc)
}

func (r *MeetingRepository) Update(ctx context.Context, meeting *models.Meeting) error {
	result, err := r.db.Exec(
		ctx,
		`UPDATE meetings
		 SET sprint_id = $2, title = $3, description = $4, meeting_date = $5::date, start_time = $6::time,
		     duration_minutes = $7, conference_link = $8, mentor_confirmed = $9, mentor_decline_reason = $10,
		     confirmed_at = $11, summary = $12, status = $13
		 WHERE id = $1`,
		meeting.ID, meeting.SprintID, meeting.Title, meeting.Description, meeting.MeetingDate, meeting.StartTime,
		meeting.DurationMinutes, meeting.ConferenceLink, meeting.MentorConfirmed, meeting.MentorDeclineReason,
		meeting.ConfirmedAt, meeting.Summary, meeting.Status,
	)
	if err != nil {
		return err
	}
	return CheckRowsAffected(result, "meeting")
}

func (r *MeetingRepository) Delete(ctx context.Context, id int) error {
	result, err := r.db.Exec(ctx, `DELETE FROM meetings WHERE id = $1`, id)
	if err != nil {
		return err
	}
	return CheckRowsAffected(result, "meeting")
}
