package service

import (
	"context"
	"errors"
	"testing"

	"github.com/hsse/project-service/internal/auth"
	"github.com/hsse/project-service/internal/models"
	"github.com/hsse/project-service/internal/repository"
)

type fakeDistClient struct {
	result *DistributionExternalResult
	err    error
}

func (f *fakeDistClient) Run(context.Context) (*DistributionExternalResult, error) {
	return f.result, f.err
}

type recordingApplyRepo struct {
	stubApplicationRepo
	got   []repository.DistributionApplicationUpdate
	stats repository.DistributionApplyStats
	err   error
}

func (r *recordingApplyRepo) ApplyDistribution(_ context.Context, updates []repository.DistributionApplicationUpdate) (repository.DistributionApplyStats, error) {
	r.got = updates
	return r.stats, r.err
}

func intPtr(v int) *int { return &v }

func TestDistributionService_External_Success(t *testing.T) {
	tid := 7
	client := &fakeDistClient{result: &DistributionExternalResult{
		Recommended: []DistributionAppDTO{
			{ID: 10, ProjectID: 1, StudentID: 100, Priority: 1, Status: "recommended", TeamID: &tid},
		},
		NotRecommended: []DistributionAppDTO{
			{ID: 11, ProjectID: 1, StudentID: 101, Priority: 2, Status: "not_recommended"},
			{ID: 12, ProjectID: 1, StudentID: 102, Priority: 3, Status: "unqualified"},
		},
	}}
	repo := &recordingApplyRepo{stats: repository.DistributionApplyStats{Applied: 2, Skipped: 1}}
	svc := NewDistributionService(nil, repo, nil, client)

	user := &auth.CurrentUser{ID: 1, Role: auth.RoleCoordinator}
	result, err := svc.Generate(context.Background(), user)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.RecommendedCount != 1 || result.NotRecommendedCount != 2 {
		t.Fatalf("bad counts: %+v", result)
	}
	if result.Applied != 2 || result.Skipped != 1 {
		t.Fatalf("bad apply stats in result: %+v", result)
	}

	// Recommended → team_id passed through, status Recommended.
	if got := repo.got[0]; got.ApplicationID != 10 || got.TeamID == nil || *got.TeamID != 7 || got.Status != models.ApplicationStatusRecommended {
		t.Fatalf("recommended update mismatch: %+v", got)
	}
	// not_recommended → status NotRecommended, no team.
	if got := repo.got[1]; got.Status != models.ApplicationStatusNotRecommended || got.TeamID != nil {
		t.Fatalf("not_recommended update mismatch: %+v", got)
	}
	// unqualified → status Unqualified.
	if got := repo.got[2]; got.Status != models.ApplicationStatusUnqualified || got.TeamID != nil {
		t.Fatalf("unqualified update mismatch: %+v", got)
	}
}

func TestDistributionService_External_UpstreamUnavailable(t *testing.T) {
	client := &fakeDistClient{err: ErrServiceUnavailable}
	repo := &recordingApplyRepo{}
	svc := NewDistributionService(nil, repo, nil, client)

	_, err := svc.Generate(context.Background(), &auth.CurrentUser{ID: 1, Role: auth.RoleCoordinator})
	if !errors.Is(err, ErrServiceUnavailable) {
		t.Fatalf("expected ErrServiceUnavailable, got %v", err)
	}
	if repo.got != nil {
		t.Fatal("repo must not be touched when upstream failed")
	}
}

func TestDistributionService_Forbidden_ForNonCoordinator(t *testing.T) {
	svc := NewDistributionService(nil, &recordingApplyRepo{}, nil, &fakeDistClient{})
	_, err := svc.Generate(context.Background(), &auth.CurrentUser{ID: 1, Role: auth.RoleStudent})
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden for student, got %v", err)
	}
}

// silence unused symbol when intPtr is added but not used by all tests
var _ = intPtr
