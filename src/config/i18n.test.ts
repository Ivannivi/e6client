import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cookieStorage } from '../utils/storage';

const mockInit = vi.fn().mockResolvedValue(undefined);
const mockUse = vi.fn().mockReturnThis();

vi.mock('i18next', () => ({
  default: {
    use: mockUse,
    init: mockInit,
  },
}));

vi.mock('i18next-browser-languagedetector', () => ({ default: { type: 'languageDetector' } }));
vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

function clearCookies() {
  document.cookie.split(';').forEach((c) => {
    const eq = c.indexOf('=');
    const name = eq >= 0 ? c.slice(0, eq).trim() : c.trim();
    document.cookie = `${name}=;path=/;max-age=0`;
  });
}

describe('i18n configuration', () => {
  beforeEach(() => {
    clearCookies();
    mockInit.mockClear();
    mockUse.mockClear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('initializes with fallback language en', async () => {
    await import('./i18n');
    expect(mockInit).toHaveBeenCalled();
    const initCall = mockInit.mock.calls[0][0];
    expect(initCall.fallbackLng).toBe('en');
  });

  it('uses stored language from settings when available', async () => {
    cookieStorage.setItem('e6-settings', JSON.stringify({ language: 'ja' }));
    await import('./i18n');
    const initCall = mockInit.mock.calls[0][0];
    expect(initCall.lng).toBe('ja');
  });

  it('returns undefined when settings JSON is malformed', async () => {
    cookieStorage.setItem('e6-settings', '{broken');
    await import('./i18n');
    const initCall = mockInit.mock.calls[0][0];
    expect(initCall.lng).toBeUndefined();
  });

  it('returns undefined when no language key is present', async () => {
    cookieStorage.setItem('e6-settings', JSON.stringify({ safeMode: true }));
    await import('./i18n');
    const initCall = mockInit.mock.calls[0][0];
    expect(initCall.lng).toBeUndefined();
  });

  it('bundles English translations as resources', async () => {
    await import('./i18n');
    const initCall = mockInit.mock.calls[0][0];
    expect(initCall.resources.en.translation).toBeDefined();
    expect(initCall.resources.en.translation.app.title).toBe('Client');
  });

  it('does not use a fetch backend', async () => {
    await import('./i18n');
    const initCall = mockInit.mock.calls[0][0];
    expect(initCall.backend).toBeUndefined();
  });

  it('configures language detection with cookie and navigator', async () => {
    await import('./i18n');
    const initCall = mockInit.mock.calls[0][0];
    expect(initCall.detection.order).toEqual(['cookie', 'navigator']);
    expect(initCall.detection.caches).toEqual(['cookie']);
    expect(initCall.detection.lookupCookie).toBe('i18nextLng');
  });

  it('disables value escaping in interpolation', async () => {
    await import('./i18n');
    const initCall = mockInit.mock.calls[0][0];
    expect(initCall.interpolation.escapeValue).toBe(false);
  });
});
