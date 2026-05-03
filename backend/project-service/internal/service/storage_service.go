package service

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type LocalFileStorage struct {
	baseDir string
}

func NewLocalFileStorage(baseDir string) *LocalFileStorage {
	return &LocalFileStorage{baseDir: baseDir}
}

func (s *LocalFileStorage) Save(userID int, fileName string, reader io.Reader) (string, error) {
	if err := os.MkdirAll(filepath.Join(s.baseDir, fmt.Sprintf("%d", userID)), 0o755); err != nil {
		return "", err
	}

	safeName := strings.ReplaceAll(fileName, string(filepath.Separator), "_")
	path := filepath.Join(s.baseDir, fmt.Sprintf("%d", userID), fmt.Sprintf("%d_%s", time.Now().UnixNano(), safeName))

	out, err := os.Create(path)
	if err != nil {
		return "", err
	}
	defer out.Close()

	if _, err := io.Copy(out, reader); err != nil {
		return "", err
	}

	return path, nil
}

func (s *LocalFileStorage) Delete(path string) error {
	return os.Remove(path)
}
