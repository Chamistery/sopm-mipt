package repository

import (
	"context"

	"github.com/hsse/project-service/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserProfileRepository struct {
	db *pgxpool.Pool
}

func NewUserProfileRepository(db *pgxpool.Pool) *UserProfileRepository {
	return &UserProfileRepository{db: db}
}

func (r *UserProfileRepository) GetByUserID(ctx context.Context, userID int) (*models.UserProfile, error) {
	query := `
		SELECT user_id, COALESCE(telegram,''), COALESCE(phone,''), COALESCE(about,''), skills, links,
		       notifications_seen_at, created_at, updated_at
		FROM user_profiles WHERE user_id = $1
	`
	profile := &models.UserProfile{}
	scanFunc := func(s Scanner) error {
		return s.Scan(&profile.UserID, &profile.Telegram, &profile.Phone, &profile.About, &profile.Skills, &profile.Links, &profile.NotificationsSeenAt, &profile.CreatedAt, &profile.UpdatedAt)
	}
	if err := ScanOne(r.db.QueryRow(ctx, query, userID), scanFunc, "user profile"); err != nil {
		return nil, err
	}
	return profile, nil
}

func (r *UserProfileRepository) Upsert(ctx context.Context, profile *models.UserProfile) error {
	query := `
		INSERT INTO user_profiles (user_id, telegram, phone, about, skills, links)
		VALUES ($1,$2,$3,$4,$5,$6)
		ON CONFLICT (user_id) DO UPDATE SET
			telegram = EXCLUDED.telegram,
			phone = EXCLUDED.phone,
			about = EXCLUDED.about,
			skills = EXCLUDED.skills,
			links = EXCLUDED.links
	`
	_, err := r.db.Exec(ctx, query, profile.UserID, profile.Telegram, profile.Phone, profile.About, profile.Skills, profile.Links)
	return err
}

func (r *UserProfileRepository) UpdateNotificationsSeenAt(ctx context.Context, userID int) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO user_profiles (user_id, notifications_seen_at)
		VALUES ($1, CURRENT_TIMESTAMP)
		ON CONFLICT (user_id) DO UPDATE SET notifications_seen_at = CURRENT_TIMESTAMP
	`, userID)
	return err
}
