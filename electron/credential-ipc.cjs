const CHANNELS = Object.freeze({
  capabilities: 'credentials:capabilities',
  get: 'credentials:get',
  set: 'credentials:set',
  delete: 'credentials:delete',
});

function unavailable() {
  return { status: 'error', code: 'unavailable' };
}

/** Register only credential operations; callers never receive filesystem access. */
function registerCredentialIpc({ ipcMain, credentialStore, isTrustedSender }) {
  for (const [operation, channel] of Object.entries(CHANNELS)) {
    ipcMain.handle(channel, async (event, ...args) => {
      try {
        if (!isTrustedSender(event)) return unavailable();
        return await credentialStore[operation](...args);
      } catch {
        return { status: 'error', code: 'storage_failure' };
      }
    });
  }
}

module.exports = { CHANNELS, registerCredentialIpc };
