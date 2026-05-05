import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { DistResizeDivider } from './DistResizeDivider';
import {
  POOL_WIDTH_DEFAULT,
  POOL_WIDTH_STORAGE_KEY,
  loadPoolWidth,
  savePoolWidth,
} from '../lib/poolWidth';

describe('DistResizeDivider', () => {
  it('updates width via mouse drag, clamped to [min, max]', () => {
    const onResize = vi.fn();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 });
    render(<DistResizeDivider rightWidth={380} onResize={onResize} minWidth={280} maxWidth={600} />);
    const sep = screen.getByRole('separator');
    fireEvent.mouseDown(sep);
    // mouse at clientX=700 → window.innerWidth - clientX = 500 (within bounds)
    fireEvent.mouseMove(document, { clientX: 700 });
    expect(onResize).toHaveBeenCalledWith(500);
    // beyond bound — clamped
    fireEvent.mouseMove(document, { clientX: 100 }); // 1100 → clamp to 600
    expect(onResize).toHaveBeenCalledWith(600);
    fireEvent.mouseMove(document, { clientX: 1100 }); // 100 → clamp to 280
    expect(onResize).toHaveBeenCalledWith(280);
    fireEvent.mouseUp(document);
  });

  it('does not call onResize after mouseup', () => {
    const onResize = vi.fn();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 });
    render(<DistResizeDivider rightWidth={380} onResize={onResize} />);
    const sep = screen.getByRole('separator');
    fireEvent.mouseDown(sep);
    fireEvent.mouseUp(document);
    onResize.mockClear();
    fireEvent.mouseMove(document, { clientX: 800 });
    expect(onResize).not.toHaveBeenCalled();
  });
});

describe('loadPoolWidth/savePoolWidth', () => {
  it('returns default when no value', () => {
    window.localStorage.removeItem(POOL_WIDTH_STORAGE_KEY);
    expect(loadPoolWidth()).toBe(POOL_WIDTH_DEFAULT);
  });

  it('roundtrips a stored value', () => {
    savePoolWidth(420);
    expect(loadPoolWidth()).toBe(420);
  });

  it('falls back to default on garbage', () => {
    window.localStorage.setItem(POOL_WIDTH_STORAGE_KEY, 'abc');
    expect(loadPoolWidth()).toBe(POOL_WIDTH_DEFAULT);
  });

  it('falls back when out of safety range', () => {
    window.localStorage.setItem(POOL_WIDTH_STORAGE_KEY, '50');
    expect(loadPoolWidth()).toBe(POOL_WIDTH_DEFAULT);
  });
});
