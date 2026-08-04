import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearchHistory } from './useSearchHistory';

describe('useSearchHistory', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts empty when nothing is stored', () => {
    const { result } = renderHook(() => useSearchHistory());
    expect(result.current.history).toEqual([]);
  });

  it('loads stored history from localStorage', () => {
    const stored = [{ query: 'fox', timestamp: 1000 }];
    localStorage.setItem('e6-search-history', JSON.stringify(stored));
    const { result } = renderHook(() => useSearchHistory());
    expect(result.current.history).toEqual(stored);
  });

  it('addToHistory prepends a new item', () => {
    const { result } = renderHook(() => useSearchHistory());
    act(() => {
      result.current.addToHistory('fox');
    });
    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].query).toBe('fox');
  });

  it('addToHistory moves an existing query to the front', () => {
    const { result } = renderHook(() => useSearchHistory());
    act(() => {
      result.current.addToHistory('fox');
      result.current.addToHistory('wolf');
      result.current.addToHistory('fox');
    });
    expect(result.current.history[0].query).toBe('fox');
    expect(result.current.history).toHaveLength(2);
  });

  it('addToHistory ignores empty/whitespace queries', () => {
    const { result } = renderHook(() => useSearchHistory());
    act(() => {
      result.current.addToHistory('   ');
      result.current.addToHistory('');
    });
    expect(result.current.history).toEqual([]);
  });

  it('caps history at 20 entries', () => {
    const { result } = renderHook(() => useSearchHistory());
    act(() => {
      for (let i = 0; i < 25; i++) {
        result.current.addToHistory(`query-${i}`);
      }
    });
    expect(result.current.history).toHaveLength(20);
    expect(result.current.history[0].query).toBe('query-24');
  });

  it('removeFromHistory removes the matching query', () => {
    const { result } = renderHook(() => useSearchHistory());
    act(() => {
      result.current.addToHistory('fox');
      result.current.addToHistory('wolf');
    });
    act(() => {
      result.current.removeFromHistory('fox');
    });
    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].query).toBe('wolf');
  });

  it('clearHistory empties the list', () => {
    const { result } = renderHook(() => useSearchHistory());
    act(() => {
      result.current.addToHistory('fox');
    });
    act(() => {
      result.current.clearHistory();
    });
    expect(result.current.history).toEqual([]);
  });

  it('persists to localStorage on change', () => {
    const { result } = renderHook(() => useSearchHistory());
    act(() => {
      result.current.addToHistory('fox');
    });
    const stored = JSON.parse(localStorage.getItem('e6-search-history') || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].query).toBe('fox');
  });
});
