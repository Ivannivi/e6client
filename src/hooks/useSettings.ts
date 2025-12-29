import { useState, useEffect, useCallback } from 'react';
import { Settings, createDefaultSettings } from '../types';
import { APP_CONFIG } from '../config';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const stored = localStorage.getItem(APP_CONFIG.storage.settingsKey);
      if (!stored) return createDefaultSettings();
      const parsed = JSON.parse(stored);
      const defaults = createDefaultSettings();
      return {
        ...defaults,
        ...parsed,
        // Ensure arrays are always arrays
        blacklistedTags: Array.isArray(parsed.blacklistedTags) 
          ? parsed.blacklistedTags 
          : defaults.blacklistedTags,
      };
    } catch {
      return createDefaultSettings();
    }
  });

  useEffect(() => {
    localStorage.setItem(APP_CONFIG.storage.settingsKey, JSON.stringify(settings));
    document.documentElement.classList.toggle('dark', settings.darkMode);
  }, [settings]);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(createDefaultSettings());
  }, []);

  return { settings, updateSettings, resetSettings };
}
