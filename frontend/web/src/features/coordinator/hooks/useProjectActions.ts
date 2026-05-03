/*
 * Mutations the coordinator runs from the project detail screen. Bundled in
 * one hook so the page component stays declarative and the cache-invalidation
 * logic lives next to the API surface, not in JSX.
 */

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { excludeApplication, type Application } from '@/api/applications';
import {
  PROJECT_STATUS_APPROVED,
  updateProject,
  type Project,
  type ProjectStatus,
} from '@/api/projects';

interface UpdateStatusVars {
  id: number;
  title: string;
  status: ProjectStatus;
}

export function useUpdateProjectStatus(
  projectId: number,
): UseMutationResult<Project, unknown, UpdateStatusVars> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars) => updateProject(vars.id, { title: vars.title, status: vars.status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['coordinator', 'project', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['coordinator', 'projects'] });
    },
  });
}

export function useApproveProject(
  projectId: number,
): UseMutationResult<Project, unknown, { title: string }> {
  const updater = useUpdateProjectStatus(projectId);
  return useMutation({
    mutationFn: ({ title }) =>
      updater.mutateAsync({ id: projectId, title, status: PROJECT_STATUS_APPROVED }),
  });
}

export function useExcludeApplication(
  projectId: number,
): UseMutationResult<Application, unknown, number> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (applicationId) => excludeApplication(applicationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['coordinator', 'project', projectId] });
    },
  });
}
