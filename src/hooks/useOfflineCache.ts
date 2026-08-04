import { useCallback, useEffect, useRef, useState } from 'react';
import type { Post, Settings } from '../types';
import { cachePosts, getCachedPosts } from '../services/db';

interface UseOfflineCacheResult {
  cachedPosts: Post[] | null;
  loadCached: (queryKey: string) => Promise<Post[] | null>;
}

export function useOfflineCache(
  settings: Settings,
  posts: Post[],
  queryKey: string
): UseOfflineCacheResult {
  const [cachedPosts, setCachedPosts] = useState<Post[] | null>(null);
  const lastPersistedKeyRef = useRef<string>('');

  // Persist posts whenever the fetched result changes while offline caching is enabled.
  useEffect(() => {
    if (!settings.offlineEnabled || !queryKey) return;
    if (posts.length === 0) return;
    if (lastPersistedKeyRef.current === queryKey) return;

    let cancelled = false;
    lastPersistedKeyRef.current = queryKey;

    cachePosts(queryKey, posts).catch((err) => {
      if (!cancelled) {
        console.error('Failed to cache posts:', err);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [settings.offlineEnabled, posts, queryKey]);

  const loadCached = useCallback(async (key: string): Promise<Post[] | null> => {
    if (!key) return null;
    const loaded = await getCachedPosts(key);
    setCachedPosts(loaded);
    return loaded;
  }, []);

  return { cachedPosts, loadCached };
}
