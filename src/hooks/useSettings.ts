import { useState, useEffect, useCallback } from 'react';
import { Settings, Account, createDefaultSettings, generateId } from '../types';
import { APP_CONFIG } from '../config';

function ensureGuestAccount(s: Settings): Settings {
  if (s.accounts.length > 0) return s;
  const guest: Account = {
    id: generateId(),
    name: 'e926 Guest',
    username: '',
    apiKey: '',
    hostUrl: 'https://e926.net',
  };
  return { ...s, accounts: [guest], activeAccountId: guest.id };
}

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
            id: generateId(),
            name: parsed.username,
            username: parsed.username,
            apiKey: parsed.apiKey,
            hostUrl: 'https://e621.net',
          };
          migratedSettings.accounts = [account];
          migratedSettings.activeAccountId = account.id;
        }
        return ensureGuestAccount(migratedSettings);
      }

      return ensureGuestAccount({
        ...defaults,
        ...parsed,
        accounts: Array.isArray(parsed.accounts) ? parsed.accounts : defaults.accounts,
        blacklistedTags: Array.isArray(parsed.blacklistedTags)
          ? parsed.blacklistedTags
          : defaults.blacklistedTags,
      });
    } catch {
      return createDefaultSettings();
    }
  });

  useEffect(() => {
    localStorage.setItem(APP_CONFIG.storage.settingsKey, JSON.stringify(settings));
  }, [settings]);

  // Follow the system color scheme; no manual toggle.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => document.documentElement.classList.toggle('dark', media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(createDefaultSettings());
  }, []);

  return { settings, updateSettings, resetSettings };
}
