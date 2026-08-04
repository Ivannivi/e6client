import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveDownload, sanitizeFilename, DownloadError } from './download';

vi.mock('streamsaver', () => ({
  default: {
    mitm: '',
    createWriteStream: vi.fn(),
  },
}));

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: { writeFile: vi.fn() },
  Directory: { Documents: 'DOCUMENTS' },
}));

interface WriterLike {
  write: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  abort: ReturnType<typeof vi.fn>;
}

function makeWritableWriter(): WriterLike {
  return {
    write: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    abort: vi.fn().mockResolvedValue(undefined),
  };
}

function makeBodyResponse(chunks: Uint8Array[], total?: number): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(chunk));
      controller.close();
    },
  });
  const headers = new Headers();
  if (total !== undefined) headers.set('content-length', String(total));
  return new Response(stream, { status: 200, headers });
}

type WindowStub = Partial<Window>;

beforeEach(() => {
  vi.resetModules();
  // Test dispatch relies on window.electronAPI / window.Capacitor.
  const win: WindowStub = {};
  Object.defineProperty(globalThis, 'window', { value: win, configurable: true });
  Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (globalThis as Record<string, unknown>).window;
  delete (globalThis as Record<string, unknown>).navigator;
});

function makeElectronBridge(overrides: Partial<Window['electronAPI']> = {}): Window['electronAPI'] {
  return {
    platform: 'linux',
    versions: { node: '22', chrome: '120', electron: '32' },
    saveFile: vi.fn().mockResolvedValue({ ok: true, path: '' }),
    getDefaultDownloadPath: vi.fn().mockResolvedValue('/home/u/Downloads'),
    ...overrides,
  };
}

describe('sanitizeFilename', () => {
  it('strips directory traversal and separators', () => {
    expect(sanitizeFilename('../../etc/passwd')).toBe('passwd');
    expect(sanitizeFilename('..\\..\\win.txt')).toBe('win.txt');
    expect(sanitizeFilename('file.png')).toBe('file.png');
  });

  it('never yields an empty or dotted name', () => {
    expect(sanitizeFilename('..')).toBe('file');
    expect(sanitizeFilename('')).toBe('file');
    expect(sanitizeFilename('...')).toBe('file');
  });

  it('caps the length', () => {
    expect(sanitizeFilename('x'.repeat(500))).toHaveLength(255);
  });
});

describe('saveDownload (Electron)', () => {
  it('writes through the preload bridge with the resolved path', async () => {
    const saveFile = vi.fn().mockResolvedValue({ ok: true, path: '/home/u/Downloads/e6.png' });
    window.electronAPI = makeElectronBridge({ saveFile });

    const bytes = new Uint8Array([1, 2, 3]);
    vi.mocked(fetch).mockResolvedValue(makeBodyResponse([bytes]));

    const onProgress = vi.fn();
    await saveDownload('https://static1.e621.net/file.png', {
      filename: 'e6_1_artist.png',
      directory: '/home/u/Downloads',
      onProgress,
    });

    expect(fetch).toHaveBeenCalledWith('https://static1.e621.net/file.png');
    expect(saveFile).toHaveBeenCalledWith({
      path: '/home/u/Downloads/e6_1_artist.png',
      data: expect.any(ArrayBuffer),
    });
    expect(onProgress).toHaveBeenLastCalledWith(expect.objectContaining({ percent: 100 }));
  });

  it('throws when the bridge reports failure', async () => {
    window.electronAPI = makeElectronBridge({
      saveFile: vi.fn().mockResolvedValue({ ok: false, error: 'disk full' }),
    });
    vi.mocked(fetch).mockResolvedValue(makeBodyResponse([new Uint8Array([1])]));

    await expect(
      saveDownload('https://x/y.png', { filename: 'y.png' })
    ).rejects.toThrow(DownloadError);
  });
});

describe('saveDownload (Capacitor)', () => {
  it('writes base64 data into Documents under the configured directory', async () => {
    const { Filesystem } = await import('@capacitor/filesystem');
    const writeFile = vi.mocked(Filesystem.writeFile).mockResolvedValue({ uri: 'file:///doc' });
    window.Capacitor = {
      Plugins: {
        App: {
          addListener: vi.fn(),
          removeAllListeners: vi.fn(),
          exitApp: vi.fn(),
        },
      },
    };

    vi.mocked(fetch).mockResolvedValue(makeBodyResponse([new TextEncoder().encode('hello')]));

    // FileReader is unavailable in node; provide a trivial implementation.
    class FakeFileReader {
      result = 'data:application/octet-stream;base64,aGVsbG8=';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL() {
        this.onload?.();
      }
    }
    Object.defineProperty(globalThis, 'FileReader', { value: FakeFileReader, configurable: true });

    await saveDownload('https://x/v.webm', { filename: 'v.webm', directory: 'e6client/videos' });

    expect(writeFile).toHaveBeenCalledWith(
      expect.objectContaining({
        path: 'e6client/videos/v.webm',
        data: 'aGVsbG8=',
        directory: 'DOCUMENTS',
        recursive: true,
      })
    );
  });
});

describe('saveDownload (web)', () => {
  it('streams through StreamSaver when a service worker is available', async () => {
    const { default: streamSaver } = await import('streamsaver');
    const writer = makeWritableWriter();
    vi.mocked(streamSaver.createWriteStream).mockReturnValue({ getWriter: () => writer });

    Object.defineProperty(globalThis, 'navigator', {
      value: { serviceWorker: {} },
      configurable: true,
    });
    vi.mocked(fetch).mockResolvedValue(
      makeBodyResponse([new Uint8Array([1, 2]), new Uint8Array([3])], 3)
    );

    const onProgress = vi.fn();
    await saveDownload('https://x/f.webm', { filename: 'f.webm', onProgress });

    expect(streamSaver.createWriteStream).toHaveBeenCalledWith('f.webm', { size: 3 });
    expect(writer.write).toHaveBeenCalledTimes(2);
    expect(writer.close).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenLastCalledWith(expect.objectContaining({ percent: 100 }));
  });

  it('falls back to a blob download without service workers', async () => {
    const blobUrl = 'blob:fake';
    const click = vi.fn();
    const fakeAnchor = { href: '', download: '', click };
    const fakeDoc = {
      createElement: vi.fn(() => fakeAnchor),
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    };
    Object.defineProperty(globalThis, 'document', { value: fakeDoc, configurable: true });
    Object.defineProperty(globalThis, 'URL', {
      value: { createObjectURL: vi.fn(() => blobUrl), revokeObjectURL: vi.fn() },
      configurable: true,
    });

    vi.mocked(fetch).mockResolvedValue(
      new Response(new Blob([new Uint8Array([1, 2, 3])]), { status: 200 })
    );

    await saveDownload('https://x/f.png', { filename: 'f.png' });

    expect(fakeAnchor.href).toBe(blobUrl);
    expect(fakeAnchor.download).toBe('f.png');
    expect(click).toHaveBeenCalled();
  });
});
