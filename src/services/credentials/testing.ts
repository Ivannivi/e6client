import { createWebCredentialStore } from './web';
import type { CredentialErrorCode, CredentialStore } from './types';

/** Deterministic session-store fake. Import directly from this test-only module. */
export function createTestCredentialStore() {
  const delegate = createWebCredentialStore();
  const failures = new Map<keyof CredentialStore, CredentialErrorCode[]>();
  const takeFailure = (operation: keyof CredentialStore) => failures.get(operation)?.shift();
  const store: CredentialStore = {
    async capabilities() {
      const code = takeFailure('capabilities');
      return code ? { status: 'error', code } : delegate.capabilities();
    },
    async get(scope) {
      const code = takeFailure('get');
      return code ? { status: 'error', code } : delegate.get(scope);
    },
    async set(scope, credentials, options) {
      const code = takeFailure('set');
      return code ? { status: 'error', code } : delegate.set(scope, credentials, options);
    },
    async delete(scope) {
      const code = takeFailure('delete');
      return code ? { status: 'error', code } : delegate.delete(scope);
    },
  };
  return {
    store,
    /** Queued failures affect only the selected operation and never mutate data. */
    failNext(operation: keyof CredentialStore, code: CredentialErrorCode = 'storage_failure') {
      const queue = failures.get(operation) ?? [];
      queue.push(code);
      failures.set(operation, queue);
    },
  };
}
