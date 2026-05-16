import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { DistributionResultModal } from './DistributionResultModal';
import type { DistributionRunResult } from '@/api/distribution';

function makeResult(over: Partial<DistributionRunResult> = {}): DistributionRunResult {
  return {
    state: 'завершено',
    applied: 0,
    skipped: 0,
    recommendedCount: 0,
    notRecommendedCount: 0,
    message: '',
    raw: null,
    ...over,
  };
}

describe('DistributionResultModal', () => {
  it('renders the counts returned by the backend', () => {
    render(
      <DistributionResultModal
        result={makeResult({ recommendedCount: 10, notRecommendedCount: 3, applied: 12, skipped: 1 })}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText('Рекомендовано').nextSibling?.textContent).toBe('10');
    expect(screen.getByText('Не рекомендовано').nextSibling?.textContent).toBe('3');
    expect(screen.getByText('Применено к БД').nextSibling?.textContent).toBe('12');
    expect(screen.getByText('Пропущено (ручные решения)').nextSibling?.textContent).toBe('1');
    // Note про защиту mentor_accepted показывается только при skipped > 0.
    expect(screen.getByText(/ручные решения ментора и студентов сохранены/i)).toBeInTheDocument();
  });

  it('hides the skipped row and the note when nothing was skipped', () => {
    render(
      <DistributionResultModal
        result={makeResult({ recommendedCount: 8, notRecommendedCount: 0, applied: 8, skipped: 0 })}
        onClose={() => {}}
      />,
    );
    expect(screen.queryByText('Пропущено (ручные решения)')).toBeNull();
    expect(screen.queryByText(/ручные решения ментора и студентов сохранены/i)).toBeNull();
  });

  it('closes on Escape and on the Close button', () => {
    const onClose = vi.fn();
    render(<DistributionResultModal result={makeResult()} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
