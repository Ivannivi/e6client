import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createDefaultSettings,
  getActiveAccount,
  isSafeProvider,
  createAccount,
  type Settings,
} from './index';
import { makeAccount, makeSettings } from '../test/factories';

describe('createDefaultSettings', () => {
  it('returns settings with a default e926 guest account', () => {
    const settings = createDefaultSettings();
    expect(settings.accounts).toHaveLength(1);
    expect(settings.accounts[0].hostUrl).toBe('https://e926.net');
    expect(settings.accounts[0].username).toBe('');
    expect(settings.accounts[0].apiKey).toBe('');
    expect(settings.activeAccountId).toBe(settings.accounts[0].id);
    expect(settings.proxyUrl).toBe('https://corsproxy.io/?');
    expect(settings.enableProxy).toBe(false);
    expect(settings.safeMode).toBe(false);
    expect(settings.blacklistedTags).toEqual([]);
  });

  it('returns a new object every call (no shared references)', () => {
    const a = createDefaultSettings();
    const b = createDefaultSettings();
    a.accounts.push(makeAccount());
    expect(b.accounts).toHaveLength(1);
  });
});

describe('getActiveAccount', () => {
  it('returns null when no active account is set', () => {
    const settings = makeSettings({ activeAccountId: null });
    expect(getActiveAccount(settings)).toBeNull();
  });

  it('returns null when activeAccountId does not match any account', () => {
    const settings = makeSettings({
      accounts: [makeAccount({ id: 'acc-1' })],
      activeAccountId: 'acc-999',
    });
    expect(getActiveAccount(settings)).toBeNull();
  });

  it('returns the matching account', () => {
    const account = makeAccount({ id: 'acc-1', name: 'Primary' });
    const settings = makeSettings({ accounts: [account], activeAccountId: 'acc-1' });
    expect(getActiveAccount(settings)).toEqual(account);
  });

  it('picks the right one out of multiple accounts', () => {
    const a = makeAccount({ id: 'a', name: 'A' });
    const b = makeAccount({ id: 'b', name: 'B' });
    const settings = makeSettings({ accounts: [a, b], activeAccountId: 'b' });
    expect(getActiveAccount(settings)?.name).toBe('B');
  });
});

describe('isSafeProvider', () => {
  it('returns true for e926.net', () => {
    expect(isSafeProvider('https://e926.net')).toBe(true);
  });

  it('returns false for e621.net', () => {
    expect(isSafeProvider('https://e621.net')).toBe(false);
  });

  it('returns false for an arbitrary host', () => {
    expect(isSafeProvider('https://example.com')).toBe(false);
  });

  it('returns false for invalid URLs', () => {
    expect(isSafeProvider('not-a-url')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isSafeProvider('')).toBe(false);
  });
});

describe('createAccount', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', {
      randomUUID: () => 'test-uuid-1234',
    });
  });

  it('creates an account with defaults', () => {
    const account = createAccount();
    expect(account).toEqual({
      id: 'test-uuid-1234',
      name: 'New Account',
      username: '',
      apiKey: '',
      hostUrl: 'https://e621.net',
    });
  });

  it('merges partial overrides', () => {
    const account = createAccount({ username: 'alice', hostUrl: 'https://e926.net' });
    expect(account.username).toBe('alice');
    expect(account.hostUrl).toBe('https://e926.net');
    expect(account.name).toBe('New Account');
  });

  it('generates a unique id per call', () => {
    let counter = 0;
    vi.stubGlobal('crypto', {
      randomUUID: () => `uuid-${++counter}`,
    });
    const a = createAccount();
    const b = createAccount();
    expect(a.id).not.toBe(b.id);
  });
});
