import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { APP_CONFIG } from './index';
import { cookieStorage } from '../utils/storage';

const LOAD_PATH = '/locales/{{lng}}/{{ns}}.json';

/**
 * Minimal i18next backend that fetches translation JSON from the public
 * `/locales/{{lng}}/translation.json` path. This avoids adding an extra
 * dependency such as i18next-http-backend.
 */
const fetchBackend = {
  type: 'backend' as const,
  read(
    language: string,
    namespace: string,
    callback: (error: Error | null, data?: Record<string, unknown>) => void
  ) {
    const url = LOAD_PATH.replace('{{lng}}', language).replace('{{ns}}', namespace);
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load translations for ${language}/${namespace}`);
        }
        return response.json() as Promise<Record<string, unknown>>;
      })
      .then((data) => callback(null, data))
      .catch((error) => callback(error instanceof Error ? error : new Error(String(error))));
  },
};

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
  .use(fetchBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: getStoredLanguage(),
    fallbackLng: 'en',
    ns: ['translation'],
    defaultNS: 'translation',
    backend: {
      loadPath: LOAD_PATH,
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
