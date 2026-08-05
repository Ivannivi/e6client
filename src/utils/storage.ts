const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function encode(key: string): string {
  return encodeURIComponent(key);
}

function decode(key: string): string {
  return decodeURIComponent(key);
}

export const cookieStorage = {
  getItem(key: string): string | null {
    if (typeof document === 'undefined') return null;
    const prefix = `${encode(key)}=`;
    const found = document.cookie
      .split('; ')
      .find((c) => c.startsWith(prefix));
    if (!found) return null;
    return decode(found.slice(prefix.length));
  },

  setItem(key: string, value: string): void {
    if (typeof document === 'undefined') return;
    document.cookie = `${encode(key)}=${encode(value)};path=/;max-age=${COOKIE_MAX_AGE};samesite=lax`;
  },

  removeItem(key: string): void {
    if (typeof document === 'undefined') return;
    document.cookie = `${encode(key)}=;path=/;max-age=0`;
  },
};
