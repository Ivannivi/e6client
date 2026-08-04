import Dexie, { type Table } from 'dexie';
import type { Account, Post, Settings, ViewMode } from '../types';
import { createDefaultSettings } from '../types';
import { APP_CONFIG } from '../config';

export interface SettingsRow {
  key: string;
  value: Settings;
}

export interface BrowsingHistoryRow {
  id?: number;
  postId: number;
  timestamp: number;
}

export interface FollowedTagRow {
  name: string;
  createdAt: number;
}

export interface CachedPostRow {
  id: number;
  post: Post;
  updatedAt: number;
}

export interface CachedPageRow {
  key: string;
  posts: Post[];
  updatedAt: number;
}

export interface SearchHistoryRow {
  query: string;
  timestamp: number;
}

export const SETTINGS_ROW_KEY = 'main';
export const MAX_SEARCH_HISTORY = 20;

export class AppDatabase extends Dexie {
  settings!: Table<SettingsRow, string>;
  accounts!: Table<Account, string>;
  browsingHistory!: Table<BrowsingHistoryRow, number>;
  followedTags!: Table<FollowedTagRow, string>;
  cachedPosts!: Table<CachedPostRow, number>;
  cachedPages!: Table<CachedPageRow, string>;
  searchHistory!: Table<SearchHistoryRow, string>;

  constructor() {
    super('e6client');
    this.version(1).stores({
      settings: 'key',
      accounts: 'id',
      browsingHistory: '++id, postId, timestamp',
      followedTags: 'name, createdAt',
      cachedPosts: 'id, updatedAt',
      cachedPages: 'key, updatedAt',
      searchHistory: 'query, timestamp',
    });
  }
}

export const db = new AppDatabase();

/** Legacy localStorage keys that existed before the IndexedDB migration. */
const LEGACY_KEYS = [
  APP_CONFIG.storage.settingsKey,
  APP_CONFIG.storage.searchHistoryKey,
  APP_CONFIG.storage.viewModeKey,
  'i18nextLng',
] as const;

function readLocalStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Merge stored settings over the defaults, tolerating partially missing
 * or legacy-shaped payloads (single-account format predating multi-account
 * support).
 */
export function mergeSettings(stored: Partial<Settings> | undefined): Settings {
  const defaults = createDefaultSettings();
  if (!stored) return defaults;

  let parsed: Record<string, unknown> = stored as Record<string, unknown>;

  // Legacy single-account format: username/apiKey at the top level.
  if (parsed.username !== undefined && parsed.accounts === undefined) {
    const migrated: Settings = {
      ...defaults,
      ...(parsed as Partial<Settings>),
      accounts: [],
      activeAccountId: null,
      blacklistedTags: Array.isArray(parsed.blacklistedTags)
        ? (parsed.blacklistedTags as string[])
        : defaults.blacklistedTags,
    };
    if (parsed.username && parsed.apiKey) {
      const account: Account = {
        id: crypto.randomUUID(),
        name: String(parsed.username),
        username: String(parsed.username),
        apiKey: String(parsed.apiKey),
        hostUrl: 'https://e621.net',
      };
      migrated.accounts = [account];
      migrated.activeAccountId = account.id;
    }
    return migrated;
  }

  return {
    ...defaults,
    ...parsed,
    accounts: Array.isArray(parsed.accounts) ? (parsed.accounts as Account[]) : defaults.accounts,
    blacklistedTags: Array.isArray(parsed.blacklistedTags)
      ? (parsed.blacklistedTags as string[])
      : defaults.blacklistedTags,
    downloadPath: typeof parsed.downloadPath === 'string' ? parsed.downloadPath : defaults.downloadPath,
    viewMode: isViewMode(parsed.viewMode) ? parsed.viewMode : defaults.viewMode,
    language: typeof parsed.language === 'string' ? parsed.language : defaults.language,
    offlineEnabled: typeof parsed.offlineEnabled === 'boolean' ? parsed.offlineEnabled : defaults.offlineEnabled,
  };
}

function isViewMode(value: unknown): value is ViewMode {
  return value === 'grid' || value === 'list' || value === 'compact';
}

/**
 * One-shot migration of the legacy localStorage payloads into IndexedDB.
 * Safe to call on every launch: entries are only imported when the target
 * row/record does not already exist, and legacy keys are removed only
 * after a successful import.
 */
export async function migrateLocalStorage(): Promise<void> {
  try {
    // Settings
    const rawSettings = readLocalStorage(APP_CONFIG.storage.settingsKey);
    const existingSettings = await db.settings.get(SETTINGS_ROW_KEY);
    if (rawSettings !== null && !existingSettings) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawSettings);
      } catch {
        parsed = undefined;
      }
      const merged = mergeSettings(parsed as Partial<Settings> | undefined);
      await db.settings.put({ key: SETTINGS_ROW_KEY, value: merged });
      localStorage.removeItem(APP_CONFIG.storage.settingsKey);
    } else if (rawSettings !== null && existingSettings) {
      // Already migrated - the settings row is authoritative.
      localStorage.removeItem(APP_CONFIG.storage.settingsKey);
    }

    // View mode lived in its own key before settings grew the field.
    const rawViewMode = readLocalStorage(APP_CONFIG.storage.viewModeKey);
    if (rawViewMode !== null && isViewMode(rawViewMode)) {
      const settingsRow = await db.settings.get(SETTINGS_ROW_KEY);
      if (!settingsRow?.value.viewMode) {
        const base = settingsRow?.value ?? createDefaultSettings();
        await db.settings.put({ key: SETTINGS_ROW_KEY, value: { ...base, viewMode: rawViewMode } });
      }
      localStorage.removeItem(APP_CONFIG.storage.viewModeKey);
    }

    // Search history
    const rawHistory = readLocalStorage(APP_CONFIG.storage.searchHistoryKey);
    if (rawHistory !== null) {
      let items: { query: string; timestamp: number }[] = [];
      try {
        items = JSON.parse(rawHistory);
      } catch {
        items = [];
      }
      const valid = items
        .filter((item) => item && typeof item.query === 'string')
        .map((item) => ({
          query: item.query,
          timestamp: Number.isFinite(Number(item.timestamp)) ? Number(item.timestamp) : Date.now(),
        }));
      await db.transaction('rw', db.searchHistory, async () => {
        await db.searchHistory.bulkPut(valid);
        await trimSearchHistory();
      });
      localStorage.removeItem(APP_CONFIG.storage.searchHistoryKey);
    }

    // Language override cached by the i18next detector.
    const rawLng = readLocalStorage('i18nextLng');
    const currentSettings = await db.settings.get(SETTINGS_ROW_KEY);
    if (rawLng && currentSettings && !currentSettings.value.language) {
      const language = String(rawLng);
      if (language) {
        await db.settings.put({
          key: SETTINGS_ROW_KEY,
          value: { ...currentSettings.value, language },
        });
      }
      localStorage.removeItem('i18nextLng');
    }
  } catch (error) {
    // Migration must never break app boot; legacy keys stay in place and
    // the import is retried on the next launch.
    console.error('e6client: localStorage migration failed', error);
  }
}

async function trimSearchHistory(): Promise<void> {
  const rows = await db.searchHistory.orderBy('timestamp').reverse().toArray();
  const keep = new Set(rows.slice(0, MAX_SEARCH_HISTORY).map((row) => row.query));
  const drop = rows.filter((row) => !keep.has(row.query)).map((row) => row.query);
  if (drop.length > 0) await db.searchHistory.bulkDelete(drop);
}

/** Read the persisted settings, merged over defaults. */
export async function getSettings(): Promise<Settings> {
  const row = await db.settings.get(SETTINGS_ROW_KEY);
  return mergeSettings(row?.value);
}

/** Persist settings; the accounts table mirrors settings.accounts. */
export async function saveSettings(settings: Settings): Promise<void> {
  await db.transaction('rw', db.settings, db.accounts, async () => {
    await db.settings.put({ key: SETTINGS_ROW_KEY, value: settings });
    await db.accounts.bulkPut(settings.accounts);
    const keep = new Set(settings.accounts.map((a) => a.id));
    const orphans = (await db.accounts.toArray())
      .filter((a) => !keep.has(a.id))
      .map((a) => a.id);
    if (orphans.length > 0) await db.accounts.bulkDelete(orphans);
  });
}

/* ---------- Browsing history ---------- */

export async function addBrowsingVisit(postId: number): Promise<void> {
  await db.browsingHistory.put({ postId, timestamp: Date.now() });
}

export async function getBrowsingHistory(limit = 100): Promise<BrowsingHistoryRow[]> {
  return db.browsingHistory
    .orderBy('timestamp')
    .reverse()
    .limit(limit)
    .toArray();
}

export async function removeBrowsingVisit(id: number): Promise<void> {
  await db.browsingHistory.delete(id);
}

export async function clearBrowsingHistory(): Promise<void> {
  await db.browsingHistory.clear();
}

/* ---------- Followed tags ---------- */

export async function getFollowedTags(): Promise<FollowedTagRow[]> {
  return db.followedTags.orderBy('createdAt').reverse().toArray();
}

export async function addFollowedTag(name: string): Promise<FollowedTagRow> {
  const row: FollowedTagRow = { name: name.trim(), createdAt: Date.now() };
  await db.followedTags.put(row);
  return row;
}

export async function removeFollowedTag(name: string): Promise<void> {
  await db.followedTags.delete(name);
}

export async function isTagFollowed(name: string): Promise<boolean> {
  return (await db.followedTags.get(name)) !== undefined;
}

/* ---------- Cached post metadata ---------- */

export async function cachePost(post: Post): Promise<void> {
  await db.cachedPosts.put({ id: post.id, post, updatedAt: Date.now() });
}

export async function cachePosts(posts: Post[]): Promise<void> {
  if (posts.length === 0) return;
  const now = Date.now();
  await db.cachedPosts.bulkPut(posts.map((post) => ({ id: post.id, post, updatedAt: now })));
}

export async function getCachedPost(id: number): Promise<Post | undefined> {
  const row = await db.cachedPosts.get(id);
  return row?.post;
}

export async function getCachedPosts(ids: number[]): Promise<Map<number, Post>> {
  const rows = await db.cachedPosts.bulkGet(ids);
  return new Map(rows.filter((row) => row !== undefined).map((row) => [row!.id, row!.post]));
}

export async function cachePage(key: string, posts: Post[]): Promise<void> {
  await db.cachedPages.put({ key, posts, updatedAt: Date.now() });
}

export async function getCachedPage(key: string): Promise<Post[] | undefined> {
  const row = await db.cachedPages.get(key);
  return row?.posts;
}

/* ---------- Search history ---------- */

export async function addSearch(query: string): Promise<void> {
  const trimmed = query.trim();
  if (!trimmed) return;
  await db.transaction('rw', db.searchHistory, async () => {
    const latest = await db.searchHistory.orderBy('timestamp').last();
    const timestamp = Math.max(Date.now(), latest ? latest.timestamp + 1 : 0);
    await db.searchHistory.put({ query: trimmed, timestamp });
    await trimSearchHistory();
  });
}

export async function getSearchHistory(): Promise<SearchHistoryRow[]> {
  return db.searchHistory.orderBy('timestamp').reverse().limit(MAX_SEARCH_HISTORY).toArray();
}

export async function removeSearch(query: string): Promise<void> {
  await db.searchHistory.delete(query);
}

export async function clearSearchHistory(): Promise<void> {
  await db.searchHistory.clear();
}
