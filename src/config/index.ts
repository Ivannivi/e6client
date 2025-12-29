export const APP_CONFIG = {
  name: 'E6 Client',
  version: '1.0.0',
  api: {
    baseUrl: 'https://e621.net',
    timeout: 15000,
    defaultPageSize: 20,
    maxRetries: 3,
  },
  ui: {
    debounceDelay: 300,
    autocompleteMinLength: 3,
    tagCollapseThreshold: 20,
    breakpoints: {
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
    },
  },
  storage: {
    settingsKey: 'e6-settings',
  },
} as const;

export const RATING = {
  SAFE: 's',
  QUESTIONABLE: 'q',
  EXPLICIT: 'e',
  labels: {
    s: 'Safe',
    q: 'Questionable',
    e: 'Explicit',
  } as Record<string, string>,
} as const;

export type Rating = 's' | 'q' | 'e';

export const TAG_STYLES = {
  category: {
    artist: 'text-yellow-600 dark:text-yellow-400',
    character: 'text-green-600 dark:text-green-400',
    species: 'text-orange-600 dark:text-orange-400',
    general: 'text-blue-600 dark:text-blue-400',
    meta: 'text-gray-600 dark:text-gray-400',
    lore: 'text-purple-600 dark:text-purple-400',
    invalid: 'text-red-600 dark:text-red-400',
  },
  rating: {
    s: 'border-green-500',
    q: 'border-yellow-500',
    e: 'border-red-500',
    default: 'border-gray-500',
  } as Record<string, string>,
} as const;

export type TagCategory = keyof typeof TAG_STYLES.category;
