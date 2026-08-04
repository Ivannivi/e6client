import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast } from './useToast';

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with no toasts', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toEqual([]);
  });

  it('adds a toast with a generated id', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.addToast('hello', 'info', 0);
    });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('hello');
    expect(result.current.toasts[0].type).toBe('info');
    expect(result.current.toasts[0].id).toBeTruthy();
  });

  it('removes a toast by id', () => {
    const { result } = renderHook(() => useToast());
    let id = '';
    act(() => {
      id = result.current.addToast('bye', 'info', 0);
    });
    act(() => {
      result.current.removeToast(id);
    });
    expect(result.current.toasts).toHaveLength(0);
  });

  it('auto-removes a toast after the duration', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.addToast('temp', 'info', 3000);
    });
    expect(result.current.toasts).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.toasts).toHaveLength(0);
  });

  it('keeps toasts with duration 0 until manually removed', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.addToast('persistent', 'info', 0);
    });
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(result.current.toasts).toHaveLength(1);
  });

  it('success helper creates a success toast', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.success('done');
    });
    expect(result.current.toasts[0].type).toBe('success');
  });

  it('error helper creates an error toast with a longer duration', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.error('broken');
    });
    expect(result.current.toasts[0].type).toBe('error');
    expect(result.current.toasts[0].duration).toBe(5000);
  });

  it('warning helper creates a warning toast', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.warning('careful');
    });
    expect(result.current.toasts[0].type).toBe('warning');
    expect(result.current.toasts[0].duration).toBe(4000);
  });

  it('info helper creates an info toast with default duration', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.info('note');
    });
    expect(result.current.toasts[0].type).toBe('info');
    expect(result.current.toasts[0].duration).toBe(3000);
  });
});
