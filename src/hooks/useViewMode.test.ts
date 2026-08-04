import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewMode } from './useViewMode';

describe('useViewMode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to grid when nothing is stored', () => {
    const { result } = renderHook(() => useViewMode());
    expect(result.current.viewMode).toBe('grid');
  });

  it('reads the stored value from localStorage', () => {
    localStorage.setItem('e6-view-mode', 'list');
    const { result } = renderHook(() => useViewMode());
    expect(result.current.viewMode).toBe('list');
  });

  it('persists changes to localStorage', () => {
    const { result } = renderHook(() => useViewMode());
    act(() => {
      result.current.setViewMode('compact');
    });
    expect(localStorage.getItem('e6-view-mode')).toBe('compact');
  });

  it('toggleViewMode cycles grid -> list -> compact -> grid', () => {
    const { result } = renderHook(() => useViewMode());
    expect(result.current.viewMode).toBe('grid');

    act(() => result.current.toggleViewMode());
    expect(result.current.viewMode).toBe('list');

    act(() => result.current.toggleViewMode());
    expect(result.current.viewMode).toBe('compact');

    act(() => result.current.toggleViewMode());
    expect(result.current.viewMode).toBe('grid');
  });

  it('falls back to grid when localStorage throws', () => {
    const original = localStorage.getItem;
    localStorage.getItem = () => {
      throw new Error('storage blocked');
    };
    const { result } = renderHook(() => useViewMode());
    expect(result.current.viewMode).toBe('grid');
    localStorage.getItem = original;
  });
});
