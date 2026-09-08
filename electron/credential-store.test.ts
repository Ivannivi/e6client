import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSecureCredentialStore } from './credential-store.cjs';
import { CHANNELS, registerCredentialIpc } from './credential-ipc.cjs';

const scope = { accountId: 'account-1', hostUrl: 'https://e621.net' };
const temporaryDirectories: string[] = [];

function temporaryDirectory() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'e6client-credentials-'));
  temporaryDirectories.push(directory);
  return directory;
}

function encryptedStorage() {
  return {
    isEncryptionAvailable: vi.fn(() => true),
    getSelectedStorageBackend: vi.fn(() => 'gnome_libsecret'),
    encryptString: vi.fn((value: string) => Buffer.from(`ciphertext:${value}`)),
    decryptString: vi.fn((value: Buffer) => {
      const encoded = value.toString();
      if (!encoded.startsWith('ciphertext:')) throw new Error('invalid ciphertext');
      return encoded.slice('ciphertext:'.length);
    }),
  };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe('Electron secure credential store', () => {
  it('persists only encrypted values across store instances', async () => {
    const directory = temporaryDirectory();
    const safeStorage = encryptedStorage();
    const first = createSecureCredentialStore({ safeStorage, userDataPath: directory, platform: 'linux' });

    expect(await first.capabilities()).toEqual({ status: 'ok', value: { persistence: 'secure' } });
    expect(await first.set(scope, { apiKey: 'very-secret-key' })).toEqual({ status: 'ok', value: undefined });
    const onDisk = fs.readFileSync(path.join(directory, 'credentials.v1.json'), 'utf8');
    expect(onDisk).not.toContain('very-secret-key');
    expect(safeStorage.encryptString).toHaveBeenCalledWith('very-secret-key');

    const afterRestart = createSecureCredentialStore({ safeStorage, userDataPath: directory, platform: 'linux' });
    expect(await afterRestart.get(scope)).toEqual({ status: 'ok', value: { apiKey: 'very-secret-key' } });
    expect(safeStorage.decryptString).toHaveBeenCalledTimes(1);
  });

  it('isolates account and canonical host scopes and deletes persistently', async () => {
    const store = createSecureCredentialStore({
      safeStorage: encryptedStorage(), userDataPath: temporaryDirectory(), platform: 'linux',
    });
    await store.set(scope, { apiKey: 'first' });
    await store.set({ ...scope, accountId: 'account-2' }, { apiKey: 'second' });
    expect(await store.get({ ...scope, hostUrl: 'HTTPS://E621.NET:443/' }))
      .toEqual({ status: 'ok', value: { apiKey: 'first' } });
    expect(await store.delete(scope)).toEqual({ status: 'ok', value: undefined });
    expect(await store.get(scope)).toEqual({ status: 'ok', value: null });
    expect(await store.get({ ...scope, accountId: 'account-2' }))
      .toEqual({ status: 'ok', value: { apiKey: 'second' } });
  });

  it('fails closed without OS-backed protection and leaves no credential file', async () => {
    const directory = temporaryDirectory();
    const safeStorage = { ...encryptedStorage(), getSelectedStorageBackend: () => 'basic_text' };
    const store = createSecureCredentialStore({ safeStorage, userDataPath: directory, platform: 'linux' });

    expect(await store.capabilities()).toEqual({ status: 'error', code: 'unavailable' });
    expect(await store.set(scope, { apiKey: 'secret' })).toEqual({ status: 'error', code: 'unavailable' });
    expect(fs.existsSync(path.join(directory, 'credentials.v1.json'))).toBe(false);
  });

  it('returns typed errors for invalid data and unreadable encrypted storage', async () => {
    const directory = temporaryDirectory();
    const safeStorage = encryptedStorage();
    const store = createSecureCredentialStore({ safeStorage, userDataPath: directory, platform: 'linux' });

    expect(await store.set({ ...scope, hostUrl: 'https://user:secret@e621.net' }, { apiKey: 'secret' }))
      .toEqual({ status: 'error', code: 'invalid_scope' });
    expect(await store.set(scope, { apiKey: ' ' })).toEqual({ status: 'error', code: 'invalid_credential' });
    fs.writeFileSync(path.join(directory, 'credentials.v1.json'), '{broken', { mode: 0o600 });
    expect(await store.get(scope)).toEqual({ status: 'error', code: 'storage_failure' });
  });
});

describe('Electron credential IPC', () => {
  it('registers only credential operations and rejects untrusted renderers', async () => {
    const handlers = new Map();
    const ipcMain = { handle: vi.fn((channel, handler) => handlers.set(channel, handler)) };
    const credentialStore = {
      capabilities: vi.fn(async () => ({ status: 'ok', value: { persistence: 'secure' } })),
      get: vi.fn(), set: vi.fn(), delete: vi.fn(),
    };
    registerCredentialIpc({ ipcMain, credentialStore, isTrustedSender: () => false });

    expect([...handlers.keys()].sort()).toEqual(Object.values(CHANNELS).sort());
    expect(await handlers.get(CHANNELS.capabilities)({})).toEqual({ status: 'error', code: 'unavailable' });
    expect(credentialStore.capabilities).not.toHaveBeenCalled();
  });

  it('passes only through trusted renderer requests and turns thrown failures into typed results', async () => {
    const handlers = new Map();
    const ipcMain = { handle: (channel: string, handler: Function) => handlers.set(channel, handler) };
    const credentialStore = {
      capabilities: async () => ({ status: 'ok', value: { persistence: 'secure' } }),
      get: async (requestScope: unknown) => ({ status: 'ok', value: requestScope }),
      set: async () => { throw new Error('storage unavailable'); },
      delete: async () => ({ status: 'ok', value: undefined }),
    };
    registerCredentialIpc({ ipcMain, credentialStore, isTrustedSender: () => true });

    expect(await handlers.get(CHANNELS.get)({}, scope)).toEqual({ status: 'ok', value: scope });
    expect(await handlers.get(CHANNELS.set)({}, scope, { apiKey: 'secret' }))
      .toEqual({ status: 'error', code: 'storage_failure' });
  });
});
