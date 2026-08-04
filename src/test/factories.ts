import type { Post, Settings, Account, Comment, User, TagSuggestion } from '../types';
import type { RawPostV2 } from '../services/api';

export function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'acc-1',
    name: 'Test Account',
    username: 'testuser',
    apiKey: 'test-key',
    hostUrl: 'https://e621.net',
    ...overrides,
  };
}

export function makeSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    accounts: [],
    activeAccountId: null,
    proxyUrl: 'https://corsproxy.io/?',
    enableProxy: false,
    safeMode: false,
    blacklistedTags: [],
    ...overrides,
  };
}

export function makePost(
  tagOverrides: Partial<Post['tags']> = {},
  fileOverrides: Partial<Post['file']> = {},
): Post {
  return {
    id: 1,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    file: { width: 100, height: 100, ext: 'png', size: 1000, md5: 'x', url: null, ...fileOverrides },
    preview: { width: 10, height: 10, url: null },
    sample: { has: false, width: 0, height: 0, url: null, alternates: {} },
    score: { up: 0, down: 0, total: 0 },
    tags: {
      general: [],
      species: [],
      character: [],
      artist: [],
      invalid: [],
      meta: [],
      lore: [],
      ...tagOverrides,
    },
    locked_tags: [],
    change_seq: 0,
    flags: {
      pending: false,
      flagged: false,
      note_locked: false,
      status_locked: false,
      rating_locked: false,
      deleted: false,
    },
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
  };
}

export function makeRawPost(overrides: Partial<RawPostV2> = {}): RawPostV2 {
  return {
    id: 4149486,
    created_at: '2023-07-04T01:21:33.766-07:00',
    updated_at: '2026-05-06T07:49:00.191-07:00',
    change_seq: 70845555,
    files: {
      meta: { md5: 'abc123', ext: 'png', size: 6749159, duration: null, has_sample: true },
      original: { width: 1874, height: 1970, url: 'https://static1.e621.net/original.png' },
      preview: {
        width: 256,
        height: 269,
        jpg: 'https://static1.e621.net/preview.jpg',
        webp: 'https://static1.e621.net/preview.webp',
      },
      sample: {
        width: 850,
        height: 894,
        jpg: 'https://static1.e621.net/sample.jpg',
        webp: 'https://static1.e621.net/sample.webp',
      },
    },
    uploader_id: 509791,
    uploader_name: 'someone',
    approver_id: 12286,
    stats: { score: { up: 3992, down: -29, total: 3963 }, fav_count: 6125, is_favorited: false, comment_count: 81 },
    flags: {
      pending: false,
      flagged: false,
      note_locked: false,
      status_locked: false,
      rating_locked: false,
      deleted: false,
    },
    has: { parent: false, children: false, active_children: false, notes: false, sample: true },
    relationships: { parent_id: null, children: [] },
    pools: [],
    rating: 's',
    locked_tags: [],
    sources: ['https://example.com/source'],
    description: 'a description',
    tags: { general: ['solo'], species: ['horse'], character: [], artist: ['someone'], invalid: [], meta: [], lore: [] },
    ...overrides,
  };
}

export function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: 1,
    post_id: 1,
    creator_id: 1,
    creator: 'commenter',
    body: 'nice post',
    score: 0,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    is_hidden: false,
    ...overrides,
  };
}

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    name: 'testuser',
    level: 20,
    blacklisted_tags: '',
    ...overrides,
  };
}

export function makeTagSuggestion(overrides: Partial<TagSuggestion> = {}): TagSuggestion {
  return {
    id: 1,
    name: 'fox',
    post_count: 100,
    category: 5,
    ...overrides,
  };
}
