package handlers

import (
	"net/http"

	"github.com/hsse/project-service/internal/httputil"
	"github.com/hsse/project-service/internal/service"
)

type DistributionHandler struct {
	service *service.DistributionService
}

func NewDistributionHandler(service *service.DistributionService) *DistributionHandler {
	return &DistributionHandler{service: service}
}

func (h *DistributionHandler) Generate(w http.ResponseWriter, r *http.Request) {
	if err := h.service.Generate(r.Context(), currentUser(r)); err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, map[string]string{"status": "started"})
}

func (h *DistributionHandler) Status(w http.ResponseWriter, r *http.Request) {
	httputil.RespondSuccess(w, http.StatusOK, h.service.Status())
}
