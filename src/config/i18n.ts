import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { APP_CONFIG } from './index';
import { cookieStorage } from '../utils/storage';
import en from '../locales/en.json';

function getStoredLanguage(): string | undefined {
  try {
    const raw = cookieStorage.getItem(APP_CONFIG.storage.settingsKey);
    if (raw) {
      const parsed = JSON.parse(raw) as { language?: string };
      if (parsed.language) return parsed.language;
    }
  } catch {
    // Ignore malformed storage.
  }
  return undefined;
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: getStoredLanguage(),
    fallbackLng: 'en',
    ns: ['translation'],
    defaultNS: 'translation',
    resources: {
      en: { translation: en },
    },
    detection: {
      order: ['cookie', 'navigator'],
      caches: ['cookie'],
      lookupCookie: 'i18nextLng',
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
