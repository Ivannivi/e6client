import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

function fireKey(key: string, opts: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {}) {
  window.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      ctrlKey: opts.ctrl,
      metaKey: opts.ctrl,
      shiftKey: opts.shift,
      altKey: opts.alt,
      bubbles: true,
    }),
  );
}

describe('useKeyboardShortcuts', () => {
  it('fires the action when the key matches', () => {
    const action = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: 'r', action, description: 'refresh' }]),
    );
    fireKey('r');
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('does not fire when disabled', () => {
    const action = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: 'r', action, description: 'refresh' }], false),
    );
    fireKey('r');
    expect(action).not.toHaveBeenCalled();
  });

  it('respects ctrl modifier', () => {
    const action = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: 's', ctrl: true, action, description: 'save' }]),
    );
    fireKey('s');
    expect(action).not.toHaveBeenCalled();
    fireKey('s', { ctrl: true });
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('respects shift modifier', () => {
    const action = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: 'a', shift: true, action, description: 'shift-a' }]),
    );
    fireKey('a');
    expect(action).not.toHaveBeenCalled();
    fireKey('a', { shift: true });
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('ignores key presses when typing in an input', () => {
    const action = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: 'r', action, description: 'refresh' }]),
    );
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent('keydown', { key: 'r', bubbles: true });
    Object.defineProperty(event, 'target', { value: input });
    window.dispatchEvent(event);

    expect(action).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('only fires the first matching shortcut', () => {
    const first = vi.fn();
    const second = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([
        { key: 'x', action: first, description: 'first' },
        { key: 'x', action: second, description: 'second' },
      ]),
    );
    fireKey('x');
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });
});
