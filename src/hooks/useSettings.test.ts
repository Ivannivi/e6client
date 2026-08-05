import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSettings } from './useSettings';
import { createDefaultSettings } from '../types';
import { makeAccount } from '../test/factories';
import { cookieStorage } from '../utils/storage';

function clearCookies() {
  document.cookie.split(';').forEach((c) => {
    const eq = c.indexOf('=');
    const name = eq >= 0 ? c.slice(0, eq).trim() : c.trim();
    document.cookie = `${name}=;path=/;max-age=0`;
  });
}

describe('useSettings', () => {
  beforeEach(() => {
    clearCookies();
    vi.stubGlobal('crypto', {
      randomUUID: () => 'test-uuid',
    });
  });

  it('returns default settings when storage is empty', () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings).toEqual(createDefaultSettings());
  });

  it('persists settings to cookies on change', () => {
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.updateSettings({ safeMode: true });
    });
    const stored = JSON.parse(cookieStorage.getItem('e6-settings') || '{}');
    expect(stored.safeMode).toBe(true);
  });

  it('updateSettings merges partial updates', () => {
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.updateSettings({ safeMode: true, enableProxy: true });
    });
    expect(result.current.settings.safeMode).toBe(true);
    expect(result.current.settings.enableProxy).toBe(true);
    expect(result.current.settings.blacklistedTags).toEqual([]);
  });

  it('resetSettings restores defaults', () => {
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.updateSettings({ safeMode: true, blacklistedTags: ['gore'] });
    });
    act(() => {
      result.current.resetSettings();
    });
    expect(result.current.settings).toEqual(createDefaultSettings());
  });

  it('migrates the old single-account format into a multi-account entry', () => {
    const oldFormat = {
      username: 'legacy_user',
      apiKey: 'legacy_key',
      safeMode: true,
    };
    cookieStorage.setItem('e6-settings', JSON.stringify(oldFormat));

    const { result } = renderHook(() => useSettings());

    expect(result.current.settings.accounts).toHaveLength(1);
    expect(result.current.settings.accounts[0].username).toBe('legacy_user');
    expect(result.current.settings.accounts[0].apiKey).toBe('legacy_key');
    expect(result.current.settings.activeAccountId).toBe(result.current.settings.accounts[0].id);
    expect(result.current.settings.safeMode).toBe(true);
  });

  it('migrates old format without credentials into a guest e926 account', () => {
    const oldFormat = { username: '', apiKey: '', safeMode: false };
    cookieStorage.setItem('e6-settings', JSON.stringify(oldFormat));

    const { result } = renderHook(() => useSettings());

    expect(result.current.settings.accounts).toHaveLength(1);
    expect(result.current.settings.accounts[0].hostUrl).toBe('https://e926.net');
    expect(result.current.settings.activeAccountId).toBe(result.current.settings.accounts[0].id);
  });

  it('loads existing multi-account settings from cookies', () => {
    const account = makeAccount({ id: 'acc-1', name: 'Primary' });
    const stored = {
      ...createDefaultSettings(),
      accounts: [account],
      activeAccountId: 'acc-1',
      safeMode: true,
    };
    cookieStorage.setItem('e6-settings', JSON.stringify(stored));

    const { result } = renderHook(() => useSettings());

    expect(result.current.settings.accounts).toHaveLength(1);
    expect(result.current.settings.activeAccountId).toBe('acc-1');
    expect(result.current.settings.safeMode).toBe(true);
  });

  it('falls back to defaults when stored JSON is corrupt', () => {
    cookieStorage.setItem('e6-settings', '{not valid json');
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings).toEqual(createDefaultSettings());
  });

  it('normalizes a missing blacklistedTags array to the default', () => {
    const stored = { ...createDefaultSettings(), blacklistedTags: 'not-an-array' };
    cookieStorage.setItem('e6-settings', JSON.stringify(stored));
    const { result } = renderHook(() => useSettings());
    expect(Array.isArray(result.current.settings.blacklistedTags)).toBe(true);
  });

  it('creates a guest e926 account when stored settings have no accounts', () => {
    const stored = {
      accounts: [],
      activeAccountId: null,
      proxyUrl: 'https://corsproxy.io/?',
      enableProxy: false,
      safeMode: false,
      blacklistedTags: [],
    };
    cookieStorage.setItem('e6-settings', JSON.stringify(stored));
    const { result } = renderHook(() => useSettings());

    expect(result.current.settings.accounts).toHaveLength(1);
    expect(result.current.settings.accounts[0].hostUrl).toBe('https://e926.net');
    expect(result.current.settings.activeAccountId).toBe(result.current.settings.accounts[0].id);
  });
});
