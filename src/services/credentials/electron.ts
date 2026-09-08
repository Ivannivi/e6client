import type {
  CredentialCapabilities,
  CredentialResult,
  CredentialScope,
  Credentials,
  CredentialStore,
  CredentialWriteOptions,
} from './types';

export interface ElectronCredentialBridge {
  readonly credentials: CredentialStore;
}

function unavailable<T>(): CredentialResult<T> {
  return { status: 'error', code: 'unavailable' };
}

function browserBridge(): ElectronCredentialBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as Window & { electronAPI?: ElectronCredentialBridge }).electronAPI;
}

/**
 * Renderer adapter for the isolated Electron bridge. It never falls back to
 * browser persistence when the desktop main process cannot protect a secret.
 */
export function createElectronCredentialStore(bridge = browserBridge()): CredentialStore {
  return {
    async capabilities(): Promise<CredentialResult<CredentialCapabilities>> {
      return bridge ? bridge.credentials.capabilities() : unavailable();
    },
    async get(scope: CredentialScope): Promise<CredentialResult<Credentials | null>> {
      return bridge ? bridge.credentials.get(scope) : unavailable();
    },
    async set(
      scope: CredentialScope,
      credentials: Credentials,
      options?: CredentialWriteOptions,
    ): Promise<CredentialResult<void>> {
      return bridge ? bridge.credentials.set(scope, credentials, options) : unavailable();
    },
    async delete(scope: CredentialScope): Promise<CredentialResult<void>> {
      return bridge ? bridge.credentials.delete(scope) : unavailable();
    },
  };
}
