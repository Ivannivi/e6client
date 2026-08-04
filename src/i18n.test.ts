import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

describe('i18n configuration', () => {
  beforeEach(() => {
    localStorage.clear();
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
    localStorage.setItem('e6-settings', JSON.stringify({ language: 'ja' }));
    await import('./i18n');
    const initCall = mockInit.mock.calls[0][0];
    expect(initCall.lng).toBe('ja');
  });

  it('returns undefined when settings JSON is malformed', async () => {
    localStorage.setItem('e6-settings', '{broken');
    await import('./i18n');
    const initCall = mockInit.mock.calls[0][0];
    expect(initCall.lng).toBeUndefined();
  });

  it('returns undefined when no language key is present', async () => {
    localStorage.setItem('e6-settings', JSON.stringify({ safeMode: true }));
    await import('./i18n');
    const initCall = mockInit.mock.calls[0][0];
    expect(initCall.lng).toBeUndefined();
  });

  it('configures the fetch backend with the correct load path', async () => {
    await import('./i18n');
    const initCall = mockInit.mock.calls[0][0];
    expect(initCall.backend.loadPath).toBe('/locales/{{lng}}/{{ns}}.json');
  });

  it('configures language detection with localStorage and navigator', async () => {
    await import('./i18n');
    const initCall = mockInit.mock.calls[0][0];
    expect(initCall.detection.order).toEqual(['localStorage', 'navigator']);
    expect(initCall.detection.caches).toEqual(['localStorage']);
  });

  it('disables value escaping in interpolation', async () => {
    await import('./i18n');
    const initCall = mockInit.mock.calls[0][0];
    expect(initCall.interpolation.escapeValue).toBe(false);
  });

  it('fetchBackend.read fetches translations successfully', async () => {
    const mockJson = { hello: 'world' };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockJson),
    });
    vi.stubGlobal('fetch', mockFetch);

    await import('./i18n');

    // The backend is passed to i18n.use(), so we can get it from the mock calls
    const useCalls = mockUse.mock.calls;
    expect(useCalls.length).toBeGreaterThan(0);
    // The first call to use() is the fetchBackend
    const backend = useCalls[0][0];
    expect(backend.type).toBe('backend');

    const callback = vi.fn();
    backend.read('en', 'translation', callback);

    expect(mockFetch).toHaveBeenCalledWith('/locales/en/translation.json');
    await vi.waitFor(() => expect(callback).toHaveBeenCalledWith(null, mockJson));
  });

  it('fetchBackend.read handles non-ok response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.stubGlobal('fetch', mockFetch);

    await import('./i18n');

    const backend = mockUse.mock.calls[0][0];
    const callback = vi.fn();
    backend.read('fr', 'translation', callback);

    await vi.waitFor(() => {
      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][0]).toBeInstanceOf(Error);
    });
  });

  it('fetchBackend.read handles fetch error', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('network'));
    vi.stubGlobal('fetch', mockFetch);

    await import('./i18n');

    const backend = mockUse.mock.calls[0][0];
    const callback = vi.fn();
    backend.read('de', 'translation', callback);

    await vi.waitFor(() => {
      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][0]).toBeInstanceOf(Error);
    });
  });

  it('fetchBackend.read handles non-Error rejection', async () => {
    const mockFetch = vi.fn().mockRejectedValue('string error');
    vi.stubGlobal('fetch', mockFetch);

    await import('./i18n');

    const backend = mockUse.mock.calls[0][0];
    const callback = vi.fn();
    backend.read('es', 'translation', callback);

    await vi.waitFor(() => {
      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][0]).toBeInstanceOf(Error);
      expect(callback.mock.calls[0][0].message).toBe('string error');
    });
  });
});
