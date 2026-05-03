import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import {
  listProjects,
  getProjectFull,
  type ListProjectsParams,
  type ProjectFull,
  type ProjectListResponse,
} from '@/api/projects';

export function useProjectsQuery(
  params: ListProjectsParams,
): UseQueryResult<ProjectListResponse, unknown> {
  return useQuery({
    queryKey: ['coordinator', 'projects', params],
    queryFn: () => listProjects(params),
  });
}

export function useProjectFullQuery(id: number): UseQueryResult<ProjectFull, unknown> {
  return useQuery({
    queryKey: ['coordinator', 'project', id, 'full'],
    queryFn: () => getProjectFull(id),
  });
}
