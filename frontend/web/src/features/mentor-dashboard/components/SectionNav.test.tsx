import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SectionNav } from './SectionNav';

const items = [
  { label: 'Основная информация' },
  { label: 'Требования и технологии' },
  { label: 'Описание и критерии' },
  { label: 'Параметры реализации' },
];

describe('SectionNav', () => {
  it('marks the active item with aria-current="step"', () => {
    render(<SectionNav items={items} active={1} onSelect={() => {}} />);
    const active = screen.getByRole('button', { name: /Требования и технологии/ });
    expect(active).toHaveAttribute('aria-current', 'step');
  });

  it('clicking another item calls onSelect with index', async () => {
    const onSelect = vi.fn();
    render(<SectionNav items={items} active={0} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: /Описание и критерии/ }));
    expect(onSelect).toHaveBeenCalledWith(2);
  });
});
