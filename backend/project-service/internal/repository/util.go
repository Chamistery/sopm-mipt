package repository

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Scanner interface {
	Scan(dest ...interface{}) error
}

func ScanOne(row Scanner, scanFunc func(Scanner) error, entityName string) error {
	err := scanFunc(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("%s not found", entityName)
	}
	if err != nil {
		return fmt.Errorf("failed to scan %s: %w", entityName, err)
	}
	return nil
}

func ScanAll[T any](
	ctx context.Context,
	db *pgxpool.Pool,
	sql string,
	args []interface{},
	scanFunc func(Scanner) (T, error),
) ([]T, error) {
	rows, err := db.Query(ctx, sql, args...)
	if err != nil {
		return nil, fmt.Errorf("query failed: %w", err)
	}
	defer rows.Close()

	var results []T
	for rows.Next() {
		item, err := scanFunc(rows)
		if err != nil {
			return nil, fmt.Errorf("failed to scan row: %w", err)
		}
		results = append(results, item)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("rows iteration error: %w", err)
	}

	return results, nil
}

func CheckRowsAffected(tag pgconn.CommandTag, entityName string) error {
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("%s not found", entityName)
	}
	return nil
}

func formatIntArray(values []int) string {
	if len(values) == 0 {
		return "{}"
	}

	parts := make([]string, 0, len(values))
	for _, value := range values {
		parts = append(parts, strconv.Itoa(value))
	}

	return "{" + strings.Join(parts, ",") + "}"
}
