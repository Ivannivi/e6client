import { registerPlugin } from '@capacitor/core';
import type {
  CredentialCapabilities,
  CredentialResult,
  CredentialScope,
  Credentials,
  CredentialStore,
  CredentialWriteOptions,
} from './types';

interface NativeCredentialPlugin {
  capabilities(): Promise<CredentialResult<CredentialCapabilities>>;
  get(scope: CredentialScope): Promise<CredentialResult<Credentials | null>>;
  set(request: CredentialScope & { credentials: Credentials; options?: CredentialWriteOptions }): Promise<CredentialResult<void>>;
  delete(scope: CredentialScope): Promise<CredentialResult<void>>;
}

const nativePlugin = registerPlugin<NativeCredentialPlugin>('CredentialStore');

function unavailable<T>(): CredentialResult<T> {
  return { status: 'error', code: 'unavailable' };
}

/**
 * Android adapter for the narrow native bridge. A missing native implementation
 * or rejected bridge call is an explicit error, never a browser-storage fallback.
 */
export function createCapacitorCredentialStore(plugin: NativeCredentialPlugin = nativePlugin): CredentialStore {
  return {
    async capabilities(): Promise<CredentialResult<CredentialCapabilities>> {
      try { return await plugin.capabilities(); } catch { return unavailable(); }
    },
    async get(scope: CredentialScope): Promise<CredentialResult<Credentials | null>> {
      try { return await plugin.get(scope); } catch { return unavailable(); }
    },
    async set(
      scope: CredentialScope,
      credentials: Credentials,
      options?: CredentialWriteOptions,
    ): Promise<CredentialResult<void>> {
      try { return await plugin.set({ ...scope, credentials, options }); } catch { return unavailable(); }
    },
    async delete(scope: CredentialScope): Promise<CredentialResult<void>> {
      try { return await plugin.delete(scope); } catch { return unavailable(); }
    },
  };
}
