import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Ripple } from './Ripple';

describe('Ripple', () => {
  it('renders children', () => {
    render(
      <Ripple onClick={vi.fn()}>
        <span>Click me</span>
      </Ripple>,
    );
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked (not disabled)', () => {
    const onClick = vi.fn();
    render(
      <Ripple onClick={onClick}>
        <span>Click me</span>
      </Ripple>,
    );
    fireEvent.click(screen.getByText('Click me'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn();
    render(
      <Ripple onClick={onClick} disabled>
        <span>Click me</span>
      </Ripple>,
    );
    fireEvent.click(screen.getByText('Click me'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('spawns a ripple span on pointerDown', () => {
    render(
      <Ripple onClick={vi.fn()}>
        <span>Press me</span>
      </Ripple>,
    );
    const host = screen.getByText('Press me').parentElement!;
    expect(host.querySelector('.rounded-full')).toBeNull();
    fireEvent.pointerDown(host);
    expect(host.querySelector('.rounded-full')).not.toBeNull();
  });

  describe('with fake timers', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('removes the ripple after animation', () => {
      render(
        <Ripple onClick={vi.fn()}>
          <span>Press me</span>
        </Ripple>,
      );
      const host = screen.getByText('Press me').parentElement!;
      fireEvent.pointerDown(host);
      expect(host.querySelector('.rounded-full')).not.toBeNull();
      act(() => {
        vi.advanceTimersByTime(550);
      });
      expect(host.querySelector('.rounded-full')).toBeNull();
    });
  });
});
