import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickActions } from './QuickActions';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) =>
      typeof opts === 'object' && opts.count !== undefined ? `${key}_${opts.count}` : key,
  }),
}));

describe('QuickActions', () => {
  it('renders random and refresh buttons', () => {
    render(<QuickActions onRandom={vi.fn()} onRefresh={vi.fn()} />);
    expect(screen.getByTitle('quickActions.randomPost')).toBeInTheDocument();
    expect(screen.getByTitle('quickActions.refresh')).toBeInTheDocument();
  });

  it('calls onRandom when random is clicked', () => {
    const onRandom = vi.fn();
    render(<QuickActions onRandom={onRandom} onRefresh={vi.fn()} />);
    fireEvent.click(screen.getByTitle('quickActions.randomPost'));
    expect(onRandom).toHaveBeenCalledTimes(1);
  });

  it('calls onRefresh when refresh is clicked', () => {
    const onRefresh = vi.fn();
    render(<QuickActions onRandom={vi.fn()} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByTitle('quickActions.refresh'));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('disables actions when loading=true', () => {
    const onRandom = vi.fn();
    const onRefresh = vi.fn();
    render(<QuickActions onRandom={onRandom} onRefresh={onRefresh} loading />);
    fireEvent.click(screen.getByTitle('quickActions.randomPost'));
    fireEvent.click(screen.getByTitle('quickActions.refresh'));
    expect(onRandom).not.toHaveBeenCalled();
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('shows spin animation on refresh icon when loading', () => {
    render(<QuickActions onRandom={vi.fn()} onRefresh={vi.fn()} loading />);
    const refreshIcon = screen.getByTitle('quickActions.refresh').querySelector('i')!;
    expect(refreshIcon.className).toContain('animate-spin');
  });
});
