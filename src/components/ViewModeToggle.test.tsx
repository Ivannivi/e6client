import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewModeToggle } from './ViewModeToggle';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) =>
      typeof opts === 'object' && opts.count !== undefined ? `${key}_${opts.count}` : key,
  }),
}));

describe('ViewModeToggle', () => {
  it('renders three buttons (grid, list, compact)', () => {
    render(<ViewModeToggle viewMode="grid" onChange={vi.fn()} />);
    expect(screen.getByTitle('viewMode.grid')).toBeInTheDocument();
    expect(screen.getByTitle('viewMode.list')).toBeInTheDocument();
    expect(screen.getByTitle('viewMode.compact')).toBeInTheDocument();
  });

  it('highlights the active mode with text-on-secondary-container class', () => {
    render(<ViewModeToggle viewMode="list" onChange={vi.fn()} />);
    const listBtn = screen.getByTitle('viewMode.list');
    expect(listBtn.className).toContain('text-on-secondary-container');

    const gridBtn = screen.getByTitle('viewMode.grid');
    expect(gridBtn.className).not.toContain('text-on-secondary-container');
  });

  it('renders a sliding indicator with bg-secondary-container', () => {
    const { container } = render(<ViewModeToggle viewMode="grid" onChange={vi.fn()} />);
    const indicator = container.querySelector('.bg-secondary-container');
    expect(indicator).toBeTruthy();
  });

  it('calls onChange with the selected mode when a button is clicked', () => {
    const onChange = vi.fn();
    render(<ViewModeToggle viewMode="grid" onChange={onChange} />);
    fireEvent.click(screen.getByTitle('viewMode.compact'));
    expect(onChange).toHaveBeenCalledWith('compact');
  });
});
