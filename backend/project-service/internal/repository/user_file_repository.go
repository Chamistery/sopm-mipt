package repository

import (
	"context"

	"github.com/hsse/project-service/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserFileRepository struct {
	db *pgxpool.Pool
}

func NewUserFileRepository(db *pgxpool.Pool) *UserFileRepository {
	return &UserFileRepository{db: db}
}

func (r *UserFileRepository) Create(ctx context.Context, file *models.UserFile) error {
	query := `
		INSERT INTO user_files (user_id, file_name, file_size, file_type, storage_path)
		VALUES ($1,$2,$3,$4,$5)
		RETURNING id, uploaded_at
	`
	return r.db.QueryRow(ctx, query, file.UserID, file.FileName, file.FileSize, file.FileType, file.StoragePath).Scan(&file.ID, &file.UploadedAt)
}

func (r *UserFileRepository) GetByUserID(ctx context.Context, userID int) ([]models.UserFile, error) {
	query := `
		SELECT id, user_id, file_name, file_size, file_type, storage_path, uploaded_at
		FROM user_files
		WHERE user_id = $1
		ORDER BY uploaded_at DESC
	`
	scanFunc := func(s Scanner) (models.UserFile, error) {
		var file models.UserFile
		err := s.Scan(&file.ID, &file.UserID, &file.FileName, &file.FileSize, &file.FileType, &file.StoragePath, &file.UploadedAt)
		return file, err
	}
	return ScanAll(ctx, r.db, query, []interface{}{userID}, scanFunc)
}

func (r *UserFileRepository) GetByID(ctx context.Context, id int) (*models.UserFile, error) {
	query := `
		SELECT id, user_id, file_name, file_size, file_type, storage_path, uploaded_at
		FROM user_files
		WHERE id = $1
	`
	file := &models.UserFile{}
	scanFunc := func(s Scanner) error {
		return s.Scan(&file.ID, &file.UserID, &file.FileName, &file.FileSize, &file.FileType, &file.StoragePath, &file.UploadedAt)
	}
	if err := ScanOne(r.db.QueryRow(ctx, query, id), scanFunc, "user file"); err != nil {
		return nil, err
	}
	return file, nil
}

func (r *UserFileRepository) Delete(ctx context.Context, id int) error {
	result, err := r.db.Exec(ctx, "DELETE FROM user_files WHERE id = $1", id)
	if err != nil {
		return err
	}
	return CheckRowsAffected(result, "user file")
}
