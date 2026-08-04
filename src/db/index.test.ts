import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  db,
  mergeSettings,
  migrateLocalStorage,
  getSettings,
  saveSettings,
  addBrowsingVisit,
  getBrowsingHistory,
  addFollowedTag,
  getFollowedTags,
  removeFollowedTag,
  isTagFollowed,
  cachePost,
  cachePosts,
  getCachedPost,
  getCachedPosts,
  cachePage,
  getCachedPage,
  addSearch,
  getSearchHistory,
  removeSearch,
  clearSearchHistory,
  MAX_SEARCH_HISTORY,
} from './index';
import { createDefaultSettings, type Settings, type Post } from '../types';

type StorageStub = Record<string, string>;

function makeLocalStorageStub(): Storage {
  const store: StorageStub = {};
  return {
    get length() {
      return Object.keys(store).length;
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
    getItem: (key: string) => (key in store ? store[key] : null),
    key: (index: number) => Object.keys(store)[index] ?? null,
    removeItem: (key: string) => {
      delete store[key];
    },
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
  };
}

const LEGACY_SETTINGS_KEY = 'e6-settings';
const LEGACY_HISTORY_KEY = 'e6-search-history';
const LEGACY_VIEWMODE_KEY = 'e6-view-mode';

async function clearDb(): Promise<void> {
  await db.transaction(
    'rw',
    [db.settings, db.accounts, db.browsingHistory, db.followedTags, db.cachedPosts, db.cachedPages, db.searchHistory],
    async () => {
      await Promise.all([
        db.settings.clear(),
        db.accounts.clear(),
        db.browsingHistory.clear(),
        db.followedTags.clear(),
        db.cachedPosts.clear(),
        db.cachedPages.clear(),
        db.searchHistory.clear(),
      ]);
    }
  );
}

let localStorageStub: Storage;

beforeEach(async () => {
  localStorageStub = makeLocalStorageStub();
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageStub,
    configurable: true,
  });
  await clearDb();
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).localStorage;
});

describe('mergeSettings', () => {
  it('returns defaults for undefined input', () => {
    expect(mergeSettings(undefined)).toEqual(createDefaultSettings());
  });

  it('spreads stored values over defaults', () => {
    const merged = mergeSettings({ safeMode: true, downloadPath: '/tmp/dl' });
    expect(merged.safeMode).toBe(true);
    expect(merged.downloadPath).toBe('/tmp/dl');
    expect(merged.accounts).toEqual([]);
    expect(merged.viewMode).toBe('grid');
  });

  it('migrates the legacy single-account format into an account', () => {
    const merged = mergeSettings({
      username: 'ivan',
      apiKey: 'secret',
      blacklistedTags: ['gore'],
    } as Partial<Settings>);
    expect(merged.accounts).toHaveLength(1);
    expect(merged.accounts[0]).toMatchObject({
      username: 'ivan',
      apiKey: 'secret',
      hostUrl: 'https://e621.net',
    });
    expect(merged.activeAccountId).toBe(merged.accounts[0].id);
    expect(merged.blacklistedTags).toEqual(['gore']);
  });

  it('rejects invalid viewMode values', () => {
    expect(mergeSettings({ viewMode: 'sideways' as Settings['viewMode'] }).viewMode).toBe('grid');
    expect(mergeSettings({ viewMode: 'compact' }).viewMode).toBe('compact');
  });
});

describe('migrateLocalStorage', () => {
  it('imports legacy settings and removes the key', async () => {
    localStorageStub.setItem(LEGACY_SETTINGS_KEY, JSON.stringify({ safeMode: true, blacklistedTags: ['gore'] }));
    await migrateLocalStorage();

    const settings = await getSettings();
    expect(settings.safeMode).toBe(true);
    expect(settings.blacklistedTags).toEqual(['gore']);
    expect(localStorageStub.getItem(LEGACY_SETTINGS_KEY)).toBeNull();
  });

  it('imports legacy search history and trims beyond the cap', async () => {
    const items = Array.from({ length: 30 }, (_, i) => ({
      query: `tag${i}`,
      timestamp: i,
    }));
    localStorageStub.setItem(LEGACY_HISTORY_KEY, JSON.stringify(items));
    await migrateLocalStorage();

    const history = await getSearchHistory();
    expect(history).toHaveLength(MAX_SEARCH_HISTORY);
    // Newest (highest timestamp) first.
    expect(history[0].query).toBe('tag29');
    expect(localStorageStub.getItem(LEGACY_HISTORY_KEY)).toBeNull();
  });

  it('migrates the view mode key into settings', async () => {
    localStorageStub.setItem(LEGACY_VIEWMODE_KEY, 'compact');
    await migrateLocalStorage();

    expect((await getSettings()).viewMode).toBe('compact');
    expect(localStorageStub.getItem(LEGACY_VIEWMODE_KEY)).toBeNull();
  });

  it('does not overwrite an existing settings row with stale storage', async () => {
    await saveSettings({ ...createDefaultSettings(), language: 'de' });
    localStorageStub.setItem(LEGACY_SETTINGS_KEY, JSON.stringify({ language: 'fr' }));
    await migrateLocalStorage();

    expect((await getSettings()).language).toBe('de');
  });

  it('keeps legacy keys when the database is unavailable', async () => {
    // Sabotage the DB so the migration fails partway, then verify no key
    // got removed for the failed settings import.
    const originalPut = db.settings.put.bind(db.settings);
    db.settings.put = (() => Promise.reject(new Error('boom'))) as unknown as typeof db.settings.put;
    try {
      localStorageStub.setItem(LEGACY_SETTINGS_KEY, JSON.stringify({ safeMode: true }));
      await migrateLocalStorage();
      expect(localStorageStub.getItem(LEGACY_SETTINGS_KEY)).not.toBeNull();
    } finally {
      db.settings.put = originalPut;
    }
  });
});

describe('saveSettings / getSettings', () => {
  it('round-trips settings through the database', async () => {
    const settings = { ...createDefaultSettings(), safeMode: true, downloadPath: '/dl' };
    await saveSettings(settings);
    expect(await getSettings()).toEqual(settings);
  });

  it('mirrors accounts into the accounts table and prunes orphans', async () => {
    const account = {
      id: 'a1',
      name: 'ivan',
      username: 'ivan',
      apiKey: 'k',
      hostUrl: 'https://e621.net',
    };
    await saveSettings({ ...createDefaultSettings(), accounts: [account], activeAccountId: 'a1' });
    expect(await db.accounts.toArray()).toEqual([account]);

    await saveSettings(createDefaultSettings());
    expect(await db.accounts.toArray()).toEqual([]);
  });
});

describe('browsing history', () => {
  it('records visits and lists them newest-first', async () => {
    await addBrowsingVisit(1);
    await addBrowsingVisit(2);
    const rows = await getBrowsingHistory();
    expect(rows.map((r) => r.postId)).toEqual([2, 1]);
    expect(rows.every((r) => typeof r.timestamp === 'number')).toBe(true);
  });

  it('allows clearing', async () => {
    await addBrowsingVisit(1);
    await db.browsingHistory.clear();
    expect(await getBrowsingHistory()).toEqual([]);
  });
});

describe('followed tags', () => {
  it('adds, lists, checks and removes tags', async () => {
    await addFollowedTag('species:fox');
    expect(await isTagFollowed('species:fox')).toBe(true);
    expect((await getFollowedTags()).map((t) => t.name)).toEqual(['species:fox']);

    await removeFollowedTag('species:fox');
    expect(await isTagFollowed('species:fox')).toBe(false);
    expect(await getFollowedTags()).toEqual([]);
  });
});

describe('cached post metadata', () => {
  const makePost = (id: number): Post =>
    ({
      id,
      created_at: '',
      updated_at: '',
      file: { width: 1, height: 1, ext: 'png', size: 1, md5: 'x', url: null },
      preview: { width: 0, height: 0, url: null },
      sample: { has: false, width: 0, height: 0, url: null, alternates: {} },
      score: { up: 0, down: 0, total: 0 },
      tags: { general: [], species: [], character: [], artist: [], invalid: [], meta: [], lore: [] },
      locked_tags: [],
      change_seq: 0,
      flags: { pending: false, flagged: false, note_locked: false, status_locked: false, rating_locked: false, deleted: false },
      rating: 's',
      fav_count: 0,
      sources: [],
      pools: [],
      relationships: { parent_id: null, has_children: false, has_active_children: false, children: [] },
      approver_id: null,
      uploader_id: 1,
      description: '',
      comment_count: 0,
      is_favorited: false,
      has_notes: false,
      duration: null,
    }) satisfies Post;

  it('caches individual posts and retrieves them by id', async () => {
    await cachePosts([makePost(1), makePost(2)]);
    expect((await getCachedPost(1))?.id).toBe(1);
    const map = await getCachedPosts([2, 99]);
    expect(map.has(2)).toBe(true);
    expect(map.has(99)).toBe(false);
  });

  it('overwrites a cached post on re-cache', async () => {
    const post = makePost(1);
    post.description = 'v1';
    await cachePost(post);
    post.description = 'v2';
    await cachePost(post);
    expect((await getCachedPost(1))?.description).toBe('v2');
  });

  it('stores and returns cached pages by key', async () => {
    await cachePage('https://e621.net::fox::1::20', [makePost(7)]);
    expect(await getCachedPage('https://e621.net::fox::1::20')).toHaveLength(1);
    expect(await getCachedPage('https://e621.net::fox::2::20')).toBeUndefined();
  });
});

describe('search history', () => {
  it('dedupes queries by name, newest wins', async () => {
    await addSearch('fox');
    await addSearch('wolf');
    await addSearch('fox');
    const history = await getSearchHistory();
    expect(history.map((h) => h.query)).toEqual(['fox', 'wolf']);
  });

  it('trims to the cap', async () => {
    for (let i = 0; i < 25; i++) await addSearch(`tag${i}`);
    expect(await getSearchHistory()).toHaveLength(MAX_SEARCH_HISTORY);
  });

  it('removes and clears entries', async () => {
    await addSearch('fox');
    await removeSearch('fox');
    expect(await getSearchHistory()).toEqual([]);

    await addSearch('fox');
    await clearSearchHistory();
    expect(await getSearchHistory()).toEqual([]);
  });
});
