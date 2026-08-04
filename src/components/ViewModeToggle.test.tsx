import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewModeToggle } from './ViewModeToggle';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) =>
      typeof opts === 'object' && opts.count !== undefined ? `${key}_${opts.count}` : key,
  }),
}));

const originalResizeObserver = window.ResizeObserver;

afterEach(() => {
  window.ResizeObserver = originalResizeObserver;
});

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

  it('sets up a ResizeObserver to reposition the indicator on layout changes', () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    window.ResizeObserver = vi.fn().mockImplementation((cb: ResizeObserverCallback) => {
      cb([] as ResizeObserverEntry[], {} as ResizeObserver);
      return { observe, unobserve: vi.fn(), disconnect };
    });

    const { unmount } = render(<ViewModeToggle viewMode="grid" onChange={vi.fn()} />);
    expect(observe).toHaveBeenCalled();

    unmount();
    expect(disconnect).toHaveBeenCalled();
  });
});
