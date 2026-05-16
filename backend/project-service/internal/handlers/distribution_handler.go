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
	result, err := h.service.Generate(r.Context(), currentUser(r))
	if err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, result)
}

func (h *DistributionHandler) Status(w http.ResponseWriter, r *http.Request) {
	httputil.RespondSuccess(w, http.StatusOK, h.service.Status())
}
