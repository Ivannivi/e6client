import { describe, expect, it, vi } from 'vitest';
import { createCapacitorCredentialStore } from './capacitor';

const scope = { accountId: 'account-1', hostUrl: 'https://e621.net' };

function plugin() {
  return {
    capabilities: vi.fn(async () => ({ status: 'ok' as const, value: { persistence: 'secure' as const } })),
    get: vi.fn(async () => ({ status: 'ok' as const, value: { apiKey: 'stored' } })),
    set: vi.fn(async () => ({ status: 'ok' as const, value: undefined })),
    delete: vi.fn(async () => ({ status: 'ok' as const, value: undefined })),
  };
}

describe('Capacitor credential adapter', () => {
  it('passes a single native payload through the narrow plugin bridge', async () => {
    const native = plugin();
    const store = createCapacitorCredentialStore(native);

    expect(await store.capabilities()).toEqual({ status: 'ok', value: { persistence: 'secure' } });
    await store.set(scope, { apiKey: 'secret' }, { requirePersistence: true });
    expect(native.set).toHaveBeenCalledWith({
      ...scope,
      credentials: { apiKey: 'secret' },
      options: { requirePersistence: true },
    });
    expect(await store.get(scope)).toEqual({ status: 'ok', value: { apiKey: 'stored' } });
    await store.delete(scope);
    expect(native.delete).toHaveBeenCalledWith(scope);
  });

  it('fails closed when the native bridge is unavailable or rejects', async () => {
    const native = plugin();
    native.get.mockRejectedValueOnce(new Error('native failure'));
    native.set.mockRejectedValueOnce(new Error('native failure'));
    const store = createCapacitorCredentialStore(native);

    expect(await store.get(scope)).toEqual({ status: 'error', code: 'unavailable' });
    expect(await store.set(scope, { apiKey: 'secret' })).toEqual({ status: 'error', code: 'unavailable' });
  });
});
