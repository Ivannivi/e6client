const fs = require('fs');
const path = require('path');

function error(code) {
  return { status: 'error', code };
}

function ok(value) {
  return { status: 'ok', value };
}

function scopeKey(scope) {
  if (!scope || typeof scope.accountId !== 'string' || !scope.accountId.trim()
    || typeof scope.hostUrl !== 'string') {
    return error('invalid_scope');
  }
  try {
    const url = new URL(scope.hostUrl);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password
      || url.pathname !== '/' || url.search || url.hash) {
      return error('invalid_scope');
    }
    return ok(JSON.stringify([scope.accountId, url.origin]));
  } catch {
    return error('invalid_scope');
  }
}

function hasValidApiKey(credentials) {
  return !!credentials && typeof credentials.apiKey === 'string' && !!credentials.apiKey.trim();
}

/**
 * Persists only Electron safeStorage ciphertext. Call this after app.whenReady(),
 * because safeStorage availability is not known before then on every platform.
 */
function createSecureCredentialStore({ safeStorage, userDataPath, platform = process.platform, fileSystem = fs }) {
  const filePath = path.join(userDataPath, 'credentials.v1.json');

  function hasSecureStorage() {
    try {
      if (!safeStorage.isEncryptionAvailable()) return false;
      // Electron deliberately reports basic_text as available on some Linux
      // configurations. It is not OS-backed protection and must fail closed.
      return platform !== 'linux'
        || typeof safeStorage.getSelectedStorageBackend === 'function'
          && safeStorage.getSelectedStorageBackend() !== 'basic_text';
    } catch {
      return false;
    }
  }

  function readEntries() {
    try {
      const entries = JSON.parse(fileSystem.readFileSync(filePath, 'utf8'));
      if (!entries || Array.isArray(entries) || typeof entries !== 'object'
        || Object.values(entries).some(value => typeof value !== 'string')) {
        return error('storage_failure');
      }
      return ok(entries);
    } catch (cause) {
      return cause && cause.code === 'ENOENT' ? ok({}) : error('storage_failure');
    }
  }

  function writeEntries(entries) {
    const temporaryPath = `${filePath}.${process.pid}.tmp`;
    try {
      fileSystem.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
      fileSystem.writeFileSync(temporaryPath, JSON.stringify(entries), { encoding: 'utf8', mode: 0o600 });
      fileSystem.renameSync(temporaryPath, filePath);
      return ok(undefined);
    } catch {
      try { fileSystem.unlinkSync(temporaryPath); } catch { /* no secret is plaintext */ }
      return error('storage_failure');
    }
  }

  return {
    async capabilities() {
      return hasSecureStorage() ? ok({ persistence: 'secure' }) : error('unavailable');
    },

    async get(scope) {
      const key = scopeKey(scope);
      if (key.status === 'error') return key;
      if (!hasSecureStorage()) return error('unavailable');
      const entries = readEntries();
      if (entries.status === 'error') return entries;
      const encrypted = entries.value[key.value];
      if (encrypted === undefined) return ok(null);
      try {
        const apiKey = safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
        return hasValidApiKey({ apiKey }) ? ok({ apiKey }) : error('storage_failure');
      } catch {
        return error('storage_failure');
      }
    },

    async set(scope, credentials) {
      const key = scopeKey(scope);
      if (key.status === 'error') return key;
      if (!hasValidApiKey(credentials)) return error('invalid_credential');
      if (!hasSecureStorage()) return error('unavailable');
      const entries = readEntries();
      if (entries.status === 'error') return entries;
      try {
        entries.value[key.value] = safeStorage.encryptString(credentials.apiKey).toString('base64');
      } catch {
        return error('storage_failure');
      }
      return writeEntries(entries.value);
    },

    async delete(scope) {
      const key = scopeKey(scope);
      if (key.status === 'error') return key;
      if (!hasSecureStorage()) return error('unavailable');
      const entries = readEntries();
      if (entries.status === 'error') return entries;
      delete entries.value[key.value];
      return writeEntries(entries.value);
    },
  };
}

module.exports = { createSecureCredentialStore };
