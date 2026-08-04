import { useState, useEffect, useCallback } from 'react';
import type { Settings } from '../types';
import { getActiveAccount } from '../types';

function extractPostId(url: string, hosts: string[]): number | null {
  try {
    const parsed = new URL(url);

    // Custom scheme: e6client://posts/<id>
    if (parsed.protocol === 'e6client:') {
      const match = parsed.pathname.match(/^\/posts\/(\d+)$/i);
      if (match) return Number(match[1]);
    }

    // HTTPS deep link: https://<host>/posts/<id>
    const host = parsed.hostname.toLowerCase();
    if (parsed.protocol === 'https:' && hosts.some((h) => h.toLowerCase() === host)) {
      const match = parsed.pathname.match(/^\/posts\/(\d+)$/i);
      if (match) return Number(match[1]);
    }

    // Query param fallback: ?post=<id>
    const queryId = parsed.searchParams.get('post');
    if (queryId) return Number(queryId);
  } catch {
    // Ignore malformed URLs.
  }

  return null;
}

export function useDeepLinks(settings: Settings) {
  const [postId, setPostId] = useState<number | null>(null);

  const clear = useCallback(() => setPostId(null), []);

  useEffect(() => {
    const activeAccount = getActiveAccount(settings);
    const hosts = activeAccount?.hostUrl
      ? [new URL(activeAccount.hostUrl).hostname, 'e621.net', 'e926.net']
      : ['e621.net', 'e926.net'];

    // Native deep links via @capacitor/app.
    if (window.Capacitor?.isNativePlatform?.()) {
      let removeListener: (() => void) | undefined;

      const setup = async () => {
        removeListener = (
          await window.Capacitor!.Plugins.App.addListener('appUrlOpen', (data) => {
            const url = data?.url;
            if (!url) return;
            const id = extractPostId(url, hosts);
            if (id && !Number.isNaN(id)) {
              setPostId(id);
            }
          })
        ).remove;
      };

      setup();

      return () => {
        removeListener?.();
      };
    }

    // Web fallback: parse the current location.
    const id = extractPostId(window.location.href, hosts);
    if (id && !Number.isNaN(id)) {
      setPostId(id);
    }
  }, [settings]);

  return { postId, clear };
}
