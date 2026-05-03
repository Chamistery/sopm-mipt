import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import {
  createTask,
  deleteTask,
  submitTaskForReview,
  updateTask,
  type CreateTaskPayload,
  type TaskDto,
  type UpdateTaskPayload,
} from '@/api/teams';

interface MutationContext {
  teamId: number;
  sprintId: number;
}

function invalidateGantt(
  queryClient: ReturnType<typeof useQueryClient>,
  ctx: MutationContext,
): void {
  void queryClient.invalidateQueries({ queryKey: ['team', ctx.teamId, 'gantt', ctx.sprintId] });
}

export function useCreateTask(
  ctx: MutationContext,
): UseMutationResult<TaskDto, unknown, CreateTaskPayload> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => createTask(payload),
    onSuccess: () => invalidateGantt(queryClient, ctx),
  });
}

export interface UpdateTaskArgs {
  id: number;
  payload: UpdateTaskPayload;
}

export function useUpdateTask(
  ctx: MutationContext,
): UseMutationResult<TaskDto, unknown, UpdateTaskArgs> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: UpdateTaskArgs) => updateTask(id, payload),
    onSuccess: () => invalidateGantt(queryClient, ctx),
  });
}

export function useSubmitTaskForReview(
  ctx: MutationContext,
): UseMutationResult<TaskDto, unknown, number> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => submitTaskForReview(id),
    onSuccess: () => invalidateGantt(queryClient, ctx),
  });
}

export function useDeleteTask(
  ctx: MutationContext,
): UseMutationResult<void, unknown, number> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTask(id),
    onSuccess: () => invalidateGantt(queryClient, ctx),
  });
}
