import { useRef } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useDebounce,
  useColumnCount,
  useIntersectionObserver,
  useLocalStorage,
} from './index';

describe('useDebounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('returns the debounced value after the delay', () => {
    const { result } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'hello' },
    });

    expect(result.current).toBe('hello');

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('hello');
  });

  it('updates when the value changes after the delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'first' } }
    );

    expect(result.current).toBe('first');

    rerender({ value: 'second' });
    expect(result.current).toBe('first');

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('second');
  });
});

describe('useColumnCount', () => {
  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  it('returns 2 by default on a small screen', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    const { result } = renderHook(() => useColumnCount());
    expect(result.current).toBe(2);
  });

  it('updates to 5 columns when width >= 1280', () => {
    const { result } = renderHook(() => useColumnCount());

    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1280,
      });
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe(5);
  });

  it('updates to 4 columns when width >= 1024', () => {
    const { result } = renderHook(() => useColumnCount());

    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe(4);
  });

  it('updates to 3 columns when width >= 768', () => {
    const { result } = renderHook(() => useColumnCount());

    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe(3);
  });

  it('falls back to 2 columns below 768', () => {
    const { result } = renderHook(() => useColumnCount());

    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600,
      });
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe(2);
  });
});

describe('useLocalStorage', () => {
  it('returns the initial value when the key is not set', () => {
    const { result } = renderHook(() => useLocalStorage('missing', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('returns the stored value from localStorage', () => {
    localStorage.setItem('existing', JSON.stringify('stored'));
    const { result } = renderHook(() => useLocalStorage('existing', 'default'));
    expect(result.current[0]).toBe('stored');
  });

  it('updates localStorage when the value changes', () => {
    const { result } = renderHook(() => useLocalStorage('key', 'initial'));

    act(() => {
      result.current[1]('updated');
    });

    expect(result.current[0]).toBe('updated');
    expect(localStorage.getItem('key')).toBe(JSON.stringify('updated'));
  });

  it('accepts a function updater', () => {
    const { result } = renderHook(() => useLocalStorage<number>('count', 0));

    act(() => {
      result.current[1]((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(1);
    expect(localStorage.getItem('count')).toBe(JSON.stringify(1));
  });
});

describe('useIntersectionObserver', () => {
  const observe = vi.fn();
  const disconnect = vi.fn();
  const unobserve = vi.fn();
  let observerCallback: (entries: { isIntersecting: boolean }[]) => void;

  beforeEach(() => {
    observe.mockClear();
    disconnect.mockClear();
    unobserve.mockClear();

    vi.stubGlobal(
      'IntersectionObserver',
      vi.fn((cb: (entries: { isIntersecting: boolean }[]) => void) => {
        observerCallback = cb;
        return { observe, disconnect, unobserve };
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls the callback when the element intersects', () => {
    const callback = vi.fn();
    const el = document.createElement('div');

    const { result } = renderHook(() => {
      const ref = useRef<HTMLElement | null>(el);
      useIntersectionObserver(ref, callback);
      return ref;
    });

    act(() => {
      observerCallback([{ isIntersecting: true }]);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does not observe when the ref has no element', () => {
    const callback = vi.fn();

    renderHook(() => {
      const ref = useRef<HTMLElement | null>(null);
      useIntersectionObserver(ref, callback);
      return ref;
    });

    expect(observe).not.toHaveBeenCalled();
  });

  it('disconnects on unmount', () => {
    const callback = vi.fn();
    const el = document.createElement('div');

    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLElement | null>(el);
      useIntersectionObserver(ref, callback);
      return ref;
    });

    unmount();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
