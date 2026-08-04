import { useState, useEffect, useCallback } from 'react';
import { Settings, createDefaultSettings } from '../types';
import { getSettings, saveSettings, migrateLocalStorage } from '../db';
import i18n from '../i18n';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(createDefaultSettings);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await migrateLocalStorage();
      if (cancelled) return;
      setSettings(await getSettings());
      setReady(true);
    })();

    return () => { cancelled = true; };
  }, []);

  // Apply the selected theme. Manual selection overrides the system scheme;
  // when set to 'system' we follow the OS preference.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const root = document.documentElement;
      root.classList.remove('light', 'dark');

      if (settings.theme === 'system') {
        root.classList.toggle('dark', media.matches);
      } else {
        root.classList.add(settings.theme);
      }
    };

    applyTheme();
    media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, [settings.theme]);

  // Write the dynamic accent color so Tailwind's primary color token uses it.
  useEffect(() => {
    document.documentElement.style.setProperty('--accent-color', settings.accentColor);
  }, [settings.accentColor]);

  // Keep i18n in sync with the chosen language once settings have loaded.
  useEffect(() => {
    if (!ready) return;
    if (settings.language && i18n.language !== settings.language) {
      i18n.changeLanguage(settings.language);
    }
  }, [settings.language, ready]);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      saveSettings(next).catch((error) => {
        console.error('e6client: failed to persist settings', error);
      });
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    const defaults = createDefaultSettings();
    saveSettings(defaults).catch((error) => {
      console.error('e6client: failed to persist settings', error);
    });
    setSettings(defaults);
  }, []);

  return { settings, updateSettings, resetSettings, ready };
}
