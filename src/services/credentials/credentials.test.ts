import { describe, expect, it, vi, afterEach } from 'vitest';
import { createWebCredentialStore } from './index';
import { createTestCredentialStore } from './testing';
import type { CredentialScope, CredentialStore } from './types';

const scope: CredentialScope = { accountId: 'account-1', hostUrl: 'https://e621.net' };
const success = { status: 'ok', value: undefined };

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe.each([
  ['web', createWebCredentialStore],
  ['test', () => createTestCredentialStore().store],
] as const)('%s credential store contract', (_, create) => {
  it('supports asynchronous writes, replacement, missing reads and idempotent deletion', async () => {
    const store = create();
    expect(store.capabilities()).toBeInstanceOf(Promise);
    expect(await store.capabilities()).toEqual({ status: 'ok', value: { persistence: 'session' } });
    expect(await store.get(scope)).toEqual({ status: 'ok', value: null });
    expect(await store.set(scope, { apiKey: 'first' })).toEqual(success);
    expect(await store.get(scope)).toEqual({ status: 'ok', value: { apiKey: 'first' } });
    expect(await store.set(scope, { apiKey: 'second' })).toEqual(success);
    expect(await store.get(scope)).toEqual({ status: 'ok', value: { apiKey: 'second' } });
    expect(await store.delete(scope)).toEqual(success);
    expect(await store.delete(scope)).toEqual(success);
    expect(await store.get(scope)).toEqual({ status: 'ok', value: null });
  });

  it('isolates account IDs, hosts, schemes, and non-default ports', async () => {
    const store = create();
    const scopes = [scope,
      { ...scope, hostUrl: 'https://e926.net' },
      { ...scope, accountId: 'account-2' },
      { ...scope, hostUrl: 'http://e621.net' },
      { ...scope, hostUrl: 'https://e621.net:8443' },
    ];
    for (const [i, key] of scopes.entries()) await store.set(key, { apiKey: `key-${i}` });
    await store.delete(scope);
    expect(await store.get(scope)).toEqual({ status: 'ok', value: null });
    for (const [i, key] of scopes.entries()) {
      if (i) expect(await store.get(key)).toEqual({ status: 'ok', value: { apiKey: `key-${i}` } });
    }
  });

  it('canonicalizes case, default port and the root slash', async () => {
    const store = create();
    await store.set({ ...scope, hostUrl: 'HTTPS://E621.NET:443/' }, { apiKey: 'canonical' });
    expect(await store.get(scope)).toEqual({ status: 'ok', value: { apiKey: 'canonical' } });
  });

  it.each(['', 'not-a-url', 'file:///tmp', 'javascript:alert(1)',
    'https://user:secret@e621.net', 'https://e621.net/api',
    'https://e621.net/?key=secret', 'https://e621.net/#secret',
  ])('rejects invalid host scope %s without including it in errors', async hostUrl => {
    const store = create();
    const invalid = { ...scope, hostUrl };
    const error = { status: 'error', code: 'invalid_scope' };
    expect(await store.set(invalid, { apiKey: 'sensitive' })).toEqual(error);
    expect(await store.get(invalid)).toEqual(error);
    expect(await store.delete(invalid)).toEqual(error);
  });

  it.each(['', '   '])('rejects blank account IDs %j', async accountId => {
    const store = create();
    expect(await store.set({ ...scope, accountId }, { apiKey: 'sensitive' }))
      .toEqual({ status: 'error', code: 'invalid_scope' });
  });

  it('does not mutate an existing entry after rejected writes', async () => {
    const store = create();
    await store.set(scope, { apiKey: 'original' });
    expect(await store.set(scope, { apiKey: '' })).toEqual({ status: 'error', code: 'invalid_credential' });
    expect(await store.set(scope, { apiKey: 'replacement' }, { requirePersistence: true }))
      .toEqual({ status: 'error', code: 'unsupported_persistence' });
    expect(await store.get(scope)).toEqual({ status: 'ok', value: { apiKey: 'original' } });
  });

  it('never shares caller-owned mutable credential objects or store instances', async () => {
    const store = create();
    const input = { apiKey: 'original' };
    await store.set(scope, input);
    input.apiKey = 'changed-input';
    const read = await store.get(scope);
    if (read.status !== 'ok' || !read.value) throw new Error('Expected stored credentials');
    Object.assign(read.value, { apiKey: 'changed-output' });
    expect(await store.get(scope)).toEqual({ status: 'ok', value: { apiKey: 'original' } });
    expect(await create().get(scope)).toEqual({ status: 'ok', value: null });
  });
});

it('does not access browser persistence or logging during any web operation', async () => {
  const forbidden = new Proxy({}, { get() { throw new Error('Persistence was accessed'); } });
  for (const name of ['localStorage', 'sessionStorage', 'indexedDB', 'caches']) vi.stubGlobal(name, forbidden);
  const cookieRead = vi.spyOn(document, 'cookie', 'get').mockImplementation(() => { throw new Error('Cookie read'); });
  const cookieWrite = vi.spyOn(document, 'cookie', 'set').mockImplementation(() => { throw new Error('Cookie write'); });
  const logs = (['log', 'warn', 'error', 'info', 'debug', 'trace', 'dir', 'table'] as const)
    .map(method => vi.spyOn(console, method).mockImplementation(() => {}));
  try {
    const store = createWebCredentialStore();
    await store.capabilities();
    await store.set(scope, { apiKey: 'sentinel-secret' });
    await store.get(scope);
    await store.set(scope, { apiKey: 'sentinel-secret' }, { requirePersistence: true });
    await store.delete(scope);
    expect(cookieRead).not.toHaveBeenCalled();
    expect(cookieWrite).not.toHaveBeenCalled();
    for (const log of logs) expect(log).not.toHaveBeenCalled();
  } finally {
    // Restore before the shared test setup performs its own storage cleanup.
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});

it('a newly loaded module starts without secrets from the previous app session', async () => {
  const first = createWebCredentialStore();
  await first.set(scope, { apiKey: 'old-session' });
  vi.resetModules();
  const { createWebCredentialStore: reloaded } = await import('./web');
  expect(await reloaded().get(scope)).toEqual({ status: 'ok', value: null });
});

describe('deterministic test failures', () => {
  it.each(['capabilities', 'get', 'set', 'delete'] as const)('can fail %s without losing data', async operation => {
    const { store, failNext } = createTestCredentialStore();
    await store.set(scope, { apiKey: 'original' });
    failNext(operation, 'unavailable');
    const invoke: Record<keyof CredentialStore, () => Promise<unknown>> = {
      capabilities: () => store.capabilities(),
      get: () => store.get(scope),
      set: () => store.set(scope, { apiKey: 'replacement' }),
      delete: () => store.delete(scope),
    };
    expect(await invoke[operation]()).toEqual({ status: 'error', code: 'unavailable' });
    expect(await store.get(scope)).toEqual({ status: 'ok', value: { apiKey: 'original' } });
    expect(await invoke[operation]()).toMatchObject({ status: 'ok' });
  });

  it('queues failures per operation and per test instance', async () => {
    const { store, failNext } = createTestCredentialStore();
    failNext('set');
    failNext('set', 'unavailable');
    expect(await store.get(scope)).toEqual({ status: 'ok', value: null });
    expect(await store.set(scope, { apiKey: 'secret' })).toEqual({ status: 'error', code: 'storage_failure' });
    expect(await store.set(scope, { apiKey: 'secret' })).toEqual({ status: 'error', code: 'unavailable' });
    expect(await store.set(scope, { apiKey: 'secret' })).toEqual(success);
    expect(await createTestCredentialStore().store.set(scope, { apiKey: 'other' })).toEqual(success);
  });
});
