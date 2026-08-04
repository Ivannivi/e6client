import { useState, useEffect, useCallback } from 'react';
import type { Settings } from '../types';

export function useSecureAppSwitcher(settings: Pick<Settings, 'secureAppSwitcher'>) {
  const [hidden, setHidden] = useState(false);

  const show = useCallback(() => setHidden(false), []);
  const hide = useCallback(() => setHidden(true), []);

  useEffect(() => {
    if (!settings.secureAppSwitcher) {
      setHidden(false);
      return;
    }

    if (window.Capacitor?.isNativePlatform?.()) {
      let removePause: (() => void) | undefined;
      let removeResume: (() => void) | undefined;

      const setup = async () => {
        removePause = (
          await window.Capacitor!.Plugins.App.addListener('pause', () => {
            setHidden(true);
          })
        ).remove;
        removeResume = (
          await window.Capacitor!.Plugins.App.addListener('resume', () => {
            setHidden(false);
          })
        ).remove;
      };

      setup();

      return () => {
        removePause?.();
        removeResume?.();
      };
    }

    // Web fallback: mirror document visibility.
    const handleVisibilityChange = () => {
      setHidden(document.hidden);
    };

    setHidden(document.hidden);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [settings.secureAppSwitcher]);

  return { hidden, show, hide };
}
