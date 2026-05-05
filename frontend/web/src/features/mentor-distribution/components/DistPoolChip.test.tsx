import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import type { ApplicantItem } from '@/api/applications';
import { DistPoolChip } from './DistPoolChip';
import { APPLICANT_MIME, readApplicantDragData } from '../lib/dragData';

function makeItem(overrides: Partial<ApplicantItem> = {}): ApplicantItem {
  return {
    applicationId: 7,
    studentId: 12,
    name: 'Иванова Мария',
    course: 3,
    gpa: 7.8,
    status: 'Ожидает',
    teamId: null,
    ...overrides,
  };
}

describe('DistPoolChip', () => {
  it('renders qualified chip with GPA, course and group', () => {
    render(
      <DistPoolChip
        item={makeItem()}
        projectId={100}
        priority={1}
        qualified
        group="Б05-322"
      />,
    );
    expect(screen.getByText(/Иванова/)).toBeInTheDocument();
    expect(screen.getByText('7.8')).toBeInTheDocument();
    expect(screen.getByText(/3 курс/)).toBeInTheDocument();
    expect(screen.getByText(/Б05-322/)).toBeInTheDocument();
    expect(screen.queryByText(/Не подходит/)).not.toBeInTheDocument();
  });

  it('renders unqualified chip with «Не подходит» mark', () => {
    render(
      <DistPoolChip
        item={makeItem({ gpa: 4.8, name: 'Орлов Владимир' })}
        projectId={100}
        priority={3}
        qualified={false}
      />,
    );
    expect(screen.getByText(/Не подходит/)).toBeInTheDocument();
  });

  it('writes payload into DataTransfer on dragstart', () => {
    render(
      <DistPoolChip
        item={makeItem()}
        projectId={100}
        priority={2}
        qualified
      />,
    );
    const chip = screen.getByRole('button');
    const map = new Map<string, string>();
    const dataTransfer = {
      setData: (k: string, v: string) => {
        map.set(k, v);
      },
      getData: (k: string) => map.get(k) ?? '',
      types: [] as string[],
      effectAllowed: 'none',
    } as unknown as DataTransfer;
    Object.defineProperty(dataTransfer, 'types', {
      get: () => Array.from(map.keys()),
    });

    fireEvent.dragStart(chip, { dataTransfer });
    expect(map.has(APPLICANT_MIME)).toBe(true);
    const payload = readApplicantDragData(dataTransfer);
    expect(payload?.applicationId).toBe(7);
    expect(payload?.projectId).toBe(100);
    expect(payload?.priority).toBe(2);
    expect(payload?.sourceTeamId).toBeNull();
  });

  it('blocks drag when disabled', () => {
    const onDragStart = vi.fn();
    render(
      <div onDragStart={onDragStart}>
        <DistPoolChip
          item={makeItem()}
          projectId={100}
          priority={1}
          qualified
          disabled
        />
      </div>,
    );
    const chip = screen.getByRole('button');
    expect(chip.getAttribute('draggable')).toBe('false');
  });
});
