import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDate,
  downloadFile,
  shareContent,
  copyToClipboard,
} from './index';

describe('formatDate', () => {
  it('returns a localized date string', () => {
    const result = formatDate('2024-01-15T00:00:00.000Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('copyToClipboard', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the async clipboard API when available', async () => {
    const result = await copyToClipboard('hello');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello');
    expect(result).toBe(true);
  });

  it('falls back to execCommand when clipboard is unavailable', async () => {
    vi.stubGlobal('navigator', {});
    const execSpy = vi.spyOn(document, 'execCommand').mockReturnValue(true);

    const result = await copyToClipboard('fallback');
    expect(result).toBe(true);
    expect(execSpy).toHaveBeenCalledWith('copy');
    execSpy.mockRestore();
  });

  it('returns false on error', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    const result = await copyToClipboard('fail');
    expect(result).toBe(false);
  });
});

describe('shareContent', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the Web Share API when available and returns true', async () => {
    const shareSpy = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share: shareSpy });
    const result = await shareContent({ title: 't', text: 'x', url: 'https://example.com' });
    expect(shareSpy).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('returns false when the user cancels the share sheet', async () => {
    const abortError = new Error('cancelled');
    abortError.name = 'AbortError';
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(abortError) });
    const result = await shareContent({ url: 'https://example.com' });
    expect(result).toBe(false);
  });

  it('falls back to clipboard when Web Share is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const result = await shareContent({ url: 'https://example.com' });
    expect(writeText).toHaveBeenCalledWith('https://example.com');
    expect(result).toBe(true);
  });

  it('returns false when neither share nor clipboard is available', async () => {
    vi.stubGlobal('navigator', {});
    const result = await shareContent({ text: '' });
    expect(result).toBe(false);
  });
});

describe('downloadFile', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('creates an anchor, clicks it, and revokes the blob url', async () => {
    const chunks = [new Uint8Array([1, 2, 3])];
    const fakeReader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({ done: false, value: chunks[0] })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };
    const fakeResponse = {
      ok: true,
      headers: { get: (name: string) => (name === 'content-length' ? '3' : null) },
      body: { getReader: () => fakeReader },
    };
    const fetchSpy = vi.fn().mockResolvedValue(fakeResponse);
    vi.stubGlobal('fetch', fetchSpy);

    const createObjectURL = vi.fn().mockReturnValue('blob:fake');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    const clickSpy = vi.fn();
    const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node as Node);
    const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node as Node);
    (vi.spyOn(document, 'createElement') as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      click: clickSpy,
      href: '',
      download: '',
    });

    const onProgress = vi.fn();
    await downloadFile('https://example.com/file.png', 'file.png', onProgress);

    expect(fetchSpy).toHaveBeenCalledWith('https://example.com/file.png');
    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake');
    expect(onProgress).toHaveBeenCalledWith(100);
    appendSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('throws and opens a new tab when the response is not ok', async () => {
    const fakeResponse = { ok: false, headers: { get: () => null }, body: null };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse));
    const openSpy = vi.fn();
    vi.stubGlobal('window', { ...window, open: openSpy });

    await expect(downloadFile('https://example.com/bad', 'bad.png')).rejects.toThrow('Download failed');
    expect(openSpy).toHaveBeenCalledWith('https://example.com/bad', '_blank');
  });
});
