import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'e6-search-history';
const MAX_HISTORY = 20;

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
}

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      // Storage full or unavailable
    }
  }, [history]);

  const addToHistory = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setHistory((prev) => {
      // Remove duplicate if exists
      const filtered = prev.filter((item) => item.query !== trimmed);
      // Add new item at the beginning
      const newHistory = [
        { query: trimmed, timestamp: Date.now() },
        ...filtered,
      ].slice(0, MAX_HISTORY);
      return newHistory;
    });
  }, []);

  const removeFromHistory = useCallback((query: string) => {
    setHistory((prev) => prev.filter((item) => item.query !== query));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
  };
}
