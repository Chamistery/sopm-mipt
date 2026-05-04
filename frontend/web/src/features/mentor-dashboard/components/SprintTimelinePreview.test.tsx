import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { SprintTimelinePreview } from './SprintTimelinePreview';

describe('SprintTimelinePreview', () => {
  it('renders placeholder when start date missing', () => {
    render(
      <SprintTimelinePreview
        config={{ count: 5, startDate: '', mode: 'simple', durationWeeks: 2 }}
      />,
    );
    expect(screen.getByText(/Укажите количество спринтов/)).toBeInTheDocument();
  });

  it('renders 5 sprint rows when valid config', () => {
    render(
      <SprintTimelinePreview
        config={{ count: 5, startDate: '2026-09-01', mode: 'simple', durationWeeks: 2 }}
      />,
    );
    expect(screen.getByText(/Спринт 1/)).toBeInTheDocument();
    expect(screen.getByText(/Спринт 5/)).toBeInTheDocument();
    expect(screen.getByText(/Итого:/)).toBeInTheDocument();
  });

  it('renders duration selects in custom mode', () => {
    render(
      <SprintTimelinePreview
        config={{
          count: 3,
          startDate: '2026-09-01',
          mode: 'custom',
          durationWeeks: 2,
          customWeeks: [1, 2, 3],
        }}
      />,
    );
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(3);
  });
});
