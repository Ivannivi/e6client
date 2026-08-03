import { describe, it, expect } from 'vitest';
import { mapV2Post, type RawPostV2 } from './api';

function makeRawPost(overrides: Partial<RawPostV2> = {}): RawPostV2 {
  return {
    id: 4149486,
    created_at: '2023-07-04T01:21:33.766-07:00',
    updated_at: '2026-05-06T07:49:00.191-07:00',
    change_seq: 70845555,
    files: {
      meta: { md5: 'abc123', ext: 'png', size: 6749159, duration: null, has_sample: true },
      original: { width: 1874, height: 1970, url: 'https://static1.e621.net/original.png' },
      preview: { width: 256, height: 269, jpg: 'https://static1.e621.net/preview.jpg', webp: 'https://static1.e621.net/preview.webp' },
      sample: { width: 850, height: 894, jpg: 'https://static1.e621.net/sample.jpg', webp: 'https://static1.e621.net/sample.webp' },
    },
    uploader_id: 509791,
    uploader_name: 'someone',
    approver_id: 12286,
    stats: { score: { up: 3992, down: -29, total: 3963 }, fav_count: 6125, is_favorited: false, comment_count: 81 },
    flags: { pending: false, flagged: false, note_locked: false, status_locked: false, rating_locked: false, deleted: false },
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

describe('mapV2Post', () => {
  it('maps files.original/meta into the legacy flat file shape', () => {
    const post = mapV2Post(makeRawPost());
    expect(post.file).toEqual({
      width: 1874,
      height: 1970,
      ext: 'png',
      size: 6749159,
      md5: 'abc123',
      url: 'https://static1.e621.net/original.png',
    });
  });

  it('prefers jpg over webp for preview/sample urls', () => {
    const post = mapV2Post(makeRawPost());
    expect(post.preview.url).toBe('https://static1.e621.net/preview.jpg');
    expect(post.sample.url).toBe('https://static1.e621.net/sample.jpg');
  });

  it('falls back to webp when jpg is unavailable', () => {
    const raw = makeRawPost();
    raw.files.preview.jpg = null;
    raw.files.sample.jpg = null;
    const post = mapV2Post(raw);
    expect(post.preview.url).toBe('https://static1.e621.net/preview.webp');
    expect(post.sample.url).toBe('https://static1.e621.net/sample.webp');
  });

  it('flattens stats into top-level fields the app already expects', () => {
    const post = mapV2Post(makeRawPost());
    expect(post.score).toEqual({ up: 3992, down: -29, total: 3963 });
    expect(post.fav_count).toBe(6125);
    expect(post.is_favorited).toBe(false);
    expect(post.comment_count).toBe(81);
  });

  it('splits has.{children,active_children} back into relationships, keeps relationships.parent_id/children', () => {
    const raw = makeRawPost({
      has: { parent: true, children: true, active_children: true, notes: true, sample: false },
      relationships: { parent_id: 999, children: [1, 2, 3] },
    });
    const post = mapV2Post(raw);
    expect(post.relationships).toEqual({
      parent_id: 999,
      has_children: true,
      has_active_children: true,
      children: [1, 2, 3],
    });
    expect(post.has_notes).toBe(true);
    expect(post.sample.has).toBe(false);
  });

  it('keeps extended-mode tags grouped by category unchanged', () => {
    const post = mapV2Post(makeRawPost());
    expect(post.tags).toEqual({
      general: ['solo'],
      species: ['horse'],
      character: [],
      artist: ['someone'],
      invalid: [],
      meta: [],
      lore: [],
    });
  });

  it('carries duration from files.meta to the top level', () => {
    const raw = makeRawPost();
    raw.files.meta.duration = 42.5;
    expect(mapV2Post(raw).duration).toBe(42.5);
  });
});
