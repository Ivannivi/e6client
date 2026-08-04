import { useState, useEffect, useCallback } from 'react';
import { Settings, createDefaultSettings } from '../types';
import { APP_CONFIG } from '../config';
import i18n from '../i18n';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const stored = localStorage.getItem(APP_CONFIG.storage.settingsKey);
      if (!stored) return createDefaultSettings();
      const parsed = JSON.parse(stored);
      const defaults = createDefaultSettings();
      
      // Migration: convert old single-account format to new multi-account format
      if (parsed.username !== undefined && parsed.accounts === undefined) {
        const migratedSettings: Settings = {
          ...defaults,
          ...parsed,
          accounts: [],
          activeAccountId: null,
          blacklistedTags: Array.isArray(parsed.blacklistedTags) 
            ? parsed.blacklistedTags 
            : defaults.blacklistedTags,
        };
        // If old format had credentials, create an account
        if (parsed.username && parsed.apiKey) {
          const account = {
            id: crypto.randomUUID(),
            name: parsed.username,
            username: parsed.username,
            apiKey: parsed.apiKey,
            hostUrl: 'https://e621.net',
          };
          migratedSettings.accounts = [account];
          migratedSettings.activeAccountId = account.id;
        }
        return migratedSettings;
      }
      
      return {
        ...defaults,
        ...parsed,
        accounts: Array.isArray(parsed.accounts) ? parsed.accounts : defaults.accounts,
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
  }, [settings]);

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

  // Keep i18n in sync with the chosen language.
  useEffect(() => {
    if (settings.language && i18n.language !== settings.language) {
      i18n.changeLanguage(settings.language);
    }
  }, [settings.language]);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(createDefaultSettings());
  }, []);

  return { settings, updateSettings, resetSettings };
}
