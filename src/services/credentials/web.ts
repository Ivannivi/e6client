import type { CredentialResult, CredentialScope, CredentialStore } from './types';

function scopeKey(scope: CredentialScope): CredentialResult<string> {
  if (!scope || typeof scope.accountId !== 'string' || !scope.accountId.trim()
    || typeof scope.hostUrl !== 'string') {
    return { status: 'error', code: 'invalid_scope' };
  }
  try {
    const url = new URL(scope.hostUrl);
    // Do not silently strip credentials, paths, or query parameters from a scope.
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password
      || url.pathname !== '/' || url.search || url.hash) {
      return { status: 'error', code: 'invalid_scope' };
    }
    return { status: 'ok', value: JSON.stringify([scope.accountId, url.origin]) };
  } catch {
    return { status: 'error', code: 'invalid_scope' };
  }
}

/** One private map per store. No browser persistence, singleton, or logging.
 * Create once per app session; a reload (or a fresh instance) starts empty.
 * Memory is not OS-secure storage and cannot protect against same-page scripts.
 */
export function createWebCredentialStore(): CredentialStore {
  const secrets = new Map<string, string>();
  return {
    async capabilities() {
      return { status: 'ok', value: { persistence: 'session' } };
    },
    async get(scope) {
      const key = scopeKey(scope);
      if (key.status === 'error') return key;
      const apiKey = secrets.get(key.value);
      return { status: 'ok', value: apiKey === undefined ? null : { apiKey } };
    },
    async set(scope, credentials, options) {
      const key = scopeKey(scope);
      if (key.status === 'error') return key;
      if (!credentials || typeof credentials.apiKey !== 'string' || !credentials.apiKey.trim()) {
        return { status: 'error', code: 'invalid_credential' };
      }
      if (options?.requirePersistence) return { status: 'error', code: 'unsupported_persistence' };
      secrets.set(key.value, credentials.apiKey);
      return { status: 'ok', value: undefined };
    },
    async delete(scope) {
      const key = scopeKey(scope);
      if (key.status === 'error') return key;
      secrets.delete(key.value);
      return { status: 'ok', value: undefined };
    },
  };
}
