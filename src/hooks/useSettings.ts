import { useState, useEffect } from 'react';
import { AppSettings, DEFAULT_SETTINGS } from '../types';

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem('e6-settings');
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    localStorage.setItem('e6-settings', JSON.stringify(settings));
    
    // Apply dark mode class to html element
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return { settings, updateSettings };
};
