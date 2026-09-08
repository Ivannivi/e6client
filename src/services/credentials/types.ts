/** Account IDs are opaque; host URLs are canonicalized to an HTTP(S) origin. */
export interface CredentialScope {
  readonly accountId: string;
  readonly hostUrl: string;
}

/** Usernames and display names remain account metadata, outside this store. */
export interface Credentials {
  readonly apiKey: string;
}

export type CredentialErrorCode =
  | 'invalid_scope'
  | 'invalid_credential'
  | 'unsupported_persistence'
  | 'unavailable'
  | 'storage_failure';

/** Errors deliberately carry no raw exception, URL, or credential payload. */
export type CredentialResult<T> =
  | { readonly status: 'ok'; readonly value: T }
  | { readonly status: 'error'; readonly code: CredentialErrorCode };

export interface CredentialCapabilities {
  /** Secure persistence means OS-backed protection, never plain browser storage. */
  readonly persistence: 'session' | 'secure';
}

export interface CredentialWriteOptions {
  /** Fail instead of silently downgrading a requested persistent write to memory. */
  readonly requirePersistence?: boolean;
}

/** Expected adapter failures resolve to typed errors, not rejected promises.
 * Missing reads return null; deleting a missing entry succeeds.
 * Implementations must never log secrets or include them in failure results.
 */
export interface CredentialStore {
  /** Adapter-wide persistence support; account-specific access failures come from operations. */
  capabilities(): Promise<CredentialResult<CredentialCapabilities>>;
  get(scope: CredentialScope): Promise<CredentialResult<Credentials | null>>;
  set(scope: CredentialScope, credentials: Credentials, options?: CredentialWriteOptions): Promise<CredentialResult<void>>;
  delete(scope: CredentialScope): Promise<CredentialResult<void>>;
}
