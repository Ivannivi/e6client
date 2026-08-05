import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cookieStorage } from './storage';

beforeEach(() => {
  document.cookie.split(';').forEach((c) => {
    const eq = c.indexOf('=');
    const name = eq >= 0 ? c.slice(0, eq).trim() : c.trim();
    document.cookie = `${name}=;path=/;max-age=0`;
  });
});

describe('cookieStorage', () => {
  it('returns null when the key does not exist', () => {
    expect(cookieStorage.getItem('missing')).toBeNull();
  });

  it('round-trips a simple string', () => {
    cookieStorage.setItem('foo', 'bar');
    expect(cookieStorage.getItem('foo')).toBe('bar');
  });

  it('round-trips JSON with special characters', () => {
    const value = JSON.stringify({ name: 'a;b,c=d', url: 'https://e621.net' });
    cookieStorage.setItem('settings', value);
    expect(cookieStorage.getItem('settings')).toBe(value);
  });

  it('removes a stored item', () => {
    cookieStorage.setItem('temp', 'x');
    expect(cookieStorage.getItem('temp')).toBe('x');
    cookieStorage.removeItem('temp');
    expect(cookieStorage.getItem('temp')).toBeNull();
  });

  it('overwrites an existing value', () => {
    cookieStorage.setItem('k', '1');
    cookieStorage.setItem('k', '2');
    expect(cookieStorage.getItem('k')).toBe('2');
  });

  it('handles keys with special characters', () => {
    cookieStorage.setItem('e6-settings', 'value');
    expect(cookieStorage.getItem('e6-settings')).toBe('value');
  });

  it('is a no-op when document is undefined', () => {
    const original = globalThis.document;
    delete (globalThis as Record<string, unknown>).document;
    try {
      expect(cookieStorage.getItem('x')).toBeNull();
      expect(() => cookieStorage.setItem('x', 'y')).not.toThrow();
      expect(() => cookieStorage.removeItem('x')).not.toThrow();
    } finally {
      globalThis.document = original;
    }
  });
});
