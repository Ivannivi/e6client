import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSettings } from './useSettings';
import { createDefaultSettings } from '../types';
import { makeAccount } from '../test/factories';

describe('useSettings', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('crypto', {
      randomUUID: () => 'test-uuid',
    });
  });

  it('returns default settings when localStorage is empty', () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings).toEqual(createDefaultSettings());
  });

  it('persists settings to localStorage on change', () => {
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.updateSettings({ safeMode: true });
    });
    const stored = JSON.parse(localStorage.getItem('e6-settings') || '{}');
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
    localStorage.setItem('e6-settings', JSON.stringify(oldFormat));

    const { result } = renderHook(() => useSettings());

    expect(result.current.settings.accounts).toHaveLength(1);
    expect(result.current.settings.accounts[0].username).toBe('legacy_user');
    expect(result.current.settings.accounts[0].apiKey).toBe('legacy_key');
    expect(result.current.settings.activeAccountId).toBe(result.current.settings.accounts[0].id);
    expect(result.current.settings.safeMode).toBe(true);
  });

  it('migrates old format without credentials into empty accounts', () => {
    const oldFormat = { username: '', apiKey: '', safeMode: false };
    localStorage.setItem('e6-settings', JSON.stringify(oldFormat));

    const { result } = renderHook(() => useSettings());

    expect(result.current.settings.accounts).toEqual([]);
    expect(result.current.settings.activeAccountId).toBeNull();
  });

  it('loads existing multi-account settings from localStorage', () => {
    const account = makeAccount({ id: 'acc-1', name: 'Primary' });
    const stored = {
      ...createDefaultSettings(),
      accounts: [account],
      activeAccountId: 'acc-1',
      safeMode: true,
    };
    localStorage.setItem('e6-settings', JSON.stringify(stored));

    const { result } = renderHook(() => useSettings());

    expect(result.current.settings.accounts).toHaveLength(1);
    expect(result.current.settings.activeAccountId).toBe('acc-1');
    expect(result.current.settings.safeMode).toBe(true);
  });

  it('falls back to defaults when stored JSON is corrupt', () => {
    localStorage.setItem('e6-settings', '{not valid json');
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings).toEqual(createDefaultSettings());
  });

  it('normalizes a missing blacklistedTags array to the default', () => {
    const stored = { ...createDefaultSettings(), blacklistedTags: 'not-an-array' };
    localStorage.setItem('e6-settings', JSON.stringify(stored));
    const { result } = renderHook(() => useSettings());
    expect(Array.isArray(result.current.settings.blacklistedTags)).toBe(true);
  });
});
