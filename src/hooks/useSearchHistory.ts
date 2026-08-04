import { useState, useCallback, useEffect } from 'react';
import { getSearchHistory, addSearch, removeSearch, clearSearchHistory } from '../db';

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
}

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    getSearchHistory()
      .then((rows) => {
        if (!cancelled) setHistory(rows);
      })
      .catch((error) => {
        console.error('e6client: failed to load search history', error);
      });
    return () => { cancelled = true; };
  }, []);

  const addToHistory = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    addSearch(trimmed)
      .then(() => getSearchHistory())
      .then(setHistory)
      .catch((error) => {
        console.error('e6client: failed to save search history', error);
      });
  }, []);

  const removeFromHistory = useCallback((query: string) => {
    removeSearch(query)
      .then(() => getSearchHistory())
      .then(setHistory)
      .catch((error) => {
        console.error('e6client: failed to remove search history entry', error);
      });
  }, []);

  const clearHistory = useCallback(() => {
    clearSearchHistory()
      .then(() => setHistory([]))
      .catch((error) => {
        console.error('e6client: failed to clear search history', error);
      });
  }, []);

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
  };
}
