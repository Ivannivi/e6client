# Credential store

This contract is the foundation for roadmap #57, issue #58. It is not yet wired
into settings or requests: legacy cookie migration belongs to #62. Existing
account persistence is therefore unchanged by this module.

Create one `createWebCredentialStore()` per application session. Its private
in-memory map is empty after reload and is never written to cookies, browser
storage, or logs. It provides no at-rest protection against scripts in the same
page, and JavaScript cannot guarantee that secret strings are zeroed in memory.
Native adapters must implement OS-backed protection before reporting `secure`
persistence; they belong to #59–#61.

```ts
import { createWebCredentialStore } from './index';

const store = createWebCredentialStore();
const scope = { accountId: 'stable-account-id', hostUrl: 'https://e621.net' };
const capabilities = await store.capabilities();
// Supply the API key from an input owned by the caller, never persisted settings.
const result = await store.set(scope, { apiKey: enteredApiKey });
if (result.status === 'error') {
  // Translate result.code for the UI; do not log secrets or raw failures.
}
```

Keys combine an opaque account ID with a canonical HTTP(S) origin. Host case,
default ports, and the root slash are normalized; scheme and non-default port
remain distinct. Userinfo, query strings, fragments, and non-root paths are
rejected rather than silently discarded. HTTP scope support is not permission
to send credentials over HTTP: transport policy belongs to the API client.
Usernames and display names stay outside the secret payload.

Capabilities describe adapter-wide persistence support; access failures for a
particular account/host are returned by the scoped operations.
All operations are asynchronous. Missing reads return `{ status: 'ok', value:
null }`; deleting a missing entry succeeds. Failures have only a typed `code`,
without exception messages, keys, or raw URLs. `requirePersistence: true` on a
write must fail with `unsupported_persistence` on this adapter, leaving any
previous entry intact. Do not use automatic plaintext fallback in future adapters.

Tests can import `createTestCredentialStore` from `./testing`. It provides the
same session behavior plus `failNext(operation, code)` to queue failures before
side effects. Queues and data are isolated per factory call. The production
barrel intentionally does not export the testing helper.

Verification: run `npm run typecheck`, `npm test`, and `npm run build`. The
contract suite covers host/account isolation, rejected writes, failure injection,
storage/log access guards, fresh instances, and fresh module loading. Once the
store is integrated, verify actual application reload clears the web session;
this change alone does not replace credentials in the existing account UI.
