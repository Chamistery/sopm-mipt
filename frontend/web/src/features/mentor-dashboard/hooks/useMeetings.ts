/*
 * TanStack Query bindings для встреч команды.
 *
 *   - `useMeetings(teamId)` — список GET /meetings?teamId=...
 *   - `useCreateMeeting(teamId)` — POST /meetings, инвалидирует кэш списка
 *   - `useUpdateMeetingStatus(teamId)` — PUT /meetings/:id, используется
 *     ментором для confirm/decline; передаёт частичный payload поверх
 *     текущей встречи (бэк требует полный объект, а не PATCH).
 *
 * Ключи запросов: ['meetings', teamId] — единая запись инвалидируется
 * любой мутацией в этой фиче.
 */

import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';

import type { Meeting } from '@/api/types';
import { createMeeting, listMeetings, updateMeeting } from '@/api/meetings';

export function meetingsKey(teamId: number): readonly unknown[] {
  return ['meetings', teamId] as const;
}

export function useMeetings(teamId: number): UseQueryResult<Meeting[], Error> {
  return useQuery<Meeting[]>({
    queryKey: meetingsKey(teamId),
    queryFn: () => listMeetings({ teamId }),
    enabled: Number.isFinite(teamId) && teamId > 0,
  });
}

export interface CreateMeetingInput {
  title: string;
  description?: string;
  meetingDate: string;
  startTime: string;
  durationMinutes: number;
  conferenceLink?: string;
}

export function useCreateMeeting(
  teamId: number,
): UseMutationResult<Meeting, Error, CreateMeetingInput> {
  const queryClient = useQueryClient();
  return useMutation<Meeting, Error, CreateMeetingInput>({
    mutationFn: (input) =>
      createMeeting({
        teamId,
        title: input.title,
        description: input.description,
        meetingDate: input.meetingDate,
        startTime: input.startTime,
        durationMinutes: input.durationMinutes,
        conferenceLink: input.conferenceLink,
        // Status is set server-side based on the caller's role; передаём
        // «Подтверждена», чтобы обозначить намерение, но бэк всё равно
        // принудительно ставит её для ментора (см. meeting_handler.go).
        status: 'Подтверждена',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: meetingsKey(teamId) });
    },
  });
}

export interface UpdateMeetingStatusInput {
  meeting: Meeting;
  decision: 'confirm' | 'decline';
  declineReason?: string;
}

export function useUpdateMeetingStatus(
  teamId: number,
): UseMutationResult<Meeting, Error, UpdateMeetingStatusInput> {
  const queryClient = useQueryClient();
  return useMutation<Meeting, Error, UpdateMeetingStatusInput>({
    mutationFn: ({ meeting, decision, declineReason }) => {
      if (meeting.id == null) {
        throw new Error('Meeting id is missing');
      }
      // Бэк PUT /meetings/:id принимает целиком объект — копируем существующие
      // поля и накладываем новые значения mentorConfirmed / mentorDeclineReason.
      // Сам status бэк проставит на основании mentorConfirmed (см. handler).
      const payload: Meeting = {
        ...meeting,
        mentorConfirmed: decision === 'confirm',
        mentorDeclineReason: decision === 'decline' ? (declineReason ?? '') : '',
      };
      return updateMeeting(meeting.id, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: meetingsKey(teamId) });
    },
  });
}
