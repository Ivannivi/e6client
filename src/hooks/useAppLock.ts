import { useState, useEffect, useCallback } from 'react';
import type { Settings } from '../types';

export function useAppLock(settings: Pick<Settings, 'appLockEnabled' | 'appLockPin'>) {
  const [locked, setLocked] = useState(false);

  const lock = useCallback(() => {
    if (settings.appLockEnabled && settings.appLockPin) {
      setLocked(true);
    }
  }, [settings.appLockEnabled, settings.appLockPin]);

  const unlock = useCallback(() => {
    setLocked(false);
  }, []);

  // Lock when the app goes to background/native pause.
  useEffect(() => {
    if (!settings.appLockEnabled || !settings.appLockPin) {
      setLocked(false);
      return;
    }

    if (window.Capacitor?.isNativePlatform?.()) {
      let removeListener: (() => void) | undefined;

      const setup = async () => {
        removeListener = (
          await window.Capacitor!.Plugins.App.addListener('pause', () => {
            setLocked(true);
          })
        ).remove;
      };

      setup();

      return () => {
        removeListener?.();
      };
    }

    // Web fallback: lock when the tab becomes hidden.
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setLocked(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [settings.appLockEnabled, settings.appLockPin]);

  return { locked, lock, unlock };
}
