import { describe, it, expect } from 'vitest';
import {
  formatFileSize,
  formatRelativeTime,
  isVideoFile,
  isAnimatedFile,
  getAspectRatio,
  isPostBlacklisted,
  buildSearchQuery,
  distributeToColumns,
  getLastSearchTerm,
  replaceLastSearchTerm,
  cn,
  generatePostFilename,
} from './index';
import type { Post } from '../types';

function makePost(overrides: Partial<Post['tags']> = {}, fileOverrides: Partial<Post['file']> = {}): Post {
  return {
    id: 1,
    created_at: '',
    updated_at: '',
    file: { width: 100, height: 100, ext: 'png', size: 1000, md5: 'x', url: null, ...fileOverrides },
    preview: { width: 10, height: 10, url: null },
    sample: { has: false, width: 0, height: 0, url: null, alternates: {} },
    score: { up: 0, down: 0, total: 0 },
    tags: { general: [], species: [], character: [], artist: [], invalid: [], meta: [], lore: [], ...overrides },
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
  };
}

describe('formatFileSize', () => {
  it('converts bytes to MB with 2 decimals', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.00 MB');
    expect(formatFileSize(1536 * 1024)).toBe('1.50 MB');
  });
});

describe('formatRelativeTime', () => {
  it('reports "Just now" for the current instant', () => {
    expect(formatRelativeTime(new Date().toISOString())).toBe('Just now');
  });

  it('reports minutes for sub-hour differences', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
    expect(formatRelativeTime(fiveMinAgo)).toBe('5m ago');
  });

  it('reports days for multi-day differences under a week', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    expect(formatRelativeTime(threeDaysAgo)).toBe('3d ago');
  });
});

describe('isVideoFile / isAnimatedFile', () => {
  it('treats webm/mp4 as video, gif as animated-but-not-video', () => {
    expect(isVideoFile('webm')).toBe(true);
    expect(isVideoFile('MP4')).toBe(true);
    expect(isVideoFile('gif')).toBe(false);
    expect(isVideoFile('png')).toBe(false);

    expect(isAnimatedFile('gif')).toBe(true);
    expect(isAnimatedFile('webm')).toBe(true);
    expect(isAnimatedFile('png')).toBe(false);
  });
});

describe('getAspectRatio', () => {
  it('formats a CSS aspect-ratio string when both dimensions are present', () => {
    expect(getAspectRatio(1920, 1080)).toBe('1920 / 1080');
  });

  it('falls back to auto when a dimension is missing', () => {
    expect(getAspectRatio(0, 1080)).toBe('auto');
    expect(getAspectRatio(1920, 0)).toBe('auto');
  });
});

describe('isPostBlacklisted', () => {
  it('returns false when the blacklist is empty', () => {
    expect(isPostBlacklisted(makePost(), [])).toBe(false);
  });

  it('matches against general/species/character/artist tags', () => {
    expect(isPostBlacklisted(makePost({ species: ['wolf'] }), ['wolf'])).toBe(true);
    expect(isPostBlacklisted(makePost({ artist: ['someone'] }), ['wolf'])).toBe(false);
  });

  it('does not match against meta or lore tags', () => {
    const post = makePost({ meta: ['wolf'], lore: ['wolf'] });
    expect(isPostBlacklisted(post, ['wolf'])).toBe(false);
  });
});

describe('buildSearchQuery', () => {
  it('adds rating:s only for safe providers (e926)', () => {
    expect(buildSearchQuery('fox', { tab: 'home', hostUrl: 'https://e926.net' })).toBe('rating:s fox');
    expect(buildSearchQuery('fox', { tab: 'home', hostUrl: 'https://e621.net' })).toBe('fox');
  });

  it('prefixes fav: for the favorites tab when a username is set', () => {
    expect(buildSearchQuery('', { tab: 'favorites', username: 'ivan', hostUrl: 'https://e621.net' })).toBe('fav:ivan');
  });

  it('omits fav: on the favorites tab without a username', () => {
    expect(buildSearchQuery('fox', { tab: 'favorites', hostUrl: 'https://e621.net' })).toBe('fox');
  });

  it('trims whitespace-only base queries', () => {
    expect(buildSearchQuery('   ', { tab: 'home', hostUrl: 'https://e621.net' })).toBe('');
  });
});

describe('distributeToColumns', () => {
  it('deals items round-robin across columns', () => {
    expect(distributeToColumns([1, 2, 3, 4, 5], 2)).toEqual([[1, 3, 5], [2, 4]]);
  });

  it('produces one empty array per column for an empty input', () => {
    expect(distributeToColumns([], 3)).toEqual([[], [], []]);
  });
});

describe('getLastSearchTerm / replaceLastSearchTerm', () => {
  it('extracts the final space-separated term', () => {
    expect(getLastSearchTerm('rating:s fo')).toBe('fo');
    expect(getLastSearchTerm('')).toBe('');
  });

  it('replaces the final term and leaves a trailing space for continued typing', () => {
    expect(replaceLastSearchTerm('rating:s fo', 'fox')).toBe('rating:s fox ');
  });
});

describe('cn', () => {
  it('joins truthy class names and drops falsy ones', () => {
    expect(cn('a', false, undefined, 'b', '')).toBe('a b');
  });
});

describe('generatePostFilename', () => {
  it('uses up to two artists, sanitized, and the file extension', () => {
    const post = makePost({ artist: ['Some Artist', 'Another One'] }, { ext: 'jpg' });
    expect(generatePostFilename(post)).toBe('e6_1_Some_Artist_Another_One.jpg');
  });

  it('falls back to "unknown" when there is no artist tag', () => {
    const post = makePost({}, { ext: 'png' });
    expect(generatePostFilename(post)).toBe('e6_1_unknown.png');
  });
});
