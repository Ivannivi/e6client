import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPosts, mapV2Post } from './posts';
import { makeSettings, makeRawPost } from '../test/factories';

const { clientGet } = vi.hoisted(() => ({ clientGet: vi.fn() }));

vi.mock('./client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./client')>()),
  client: { get: clientGet },
}));

beforeEach(() => {
  clientGet.mockReset();
});

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

describe('getPosts', () => {
  it('requests the posts endpoint with the search parameters', async () => {
    clientGet.mockResolvedValue([]);
    const settings = makeSettings();

    await getPosts(settings, 'fox', 2, 40);

    expect(clientGet).toHaveBeenCalledWith('/posts.json', {
      tags: 'fox',
      page: '2',
      limit: '40',
      v2: 'true',
      mode: 'extended',
    }, settings);
  });

  it('uses the configured default page size and page 1 when omitted', async () => {
    clientGet.mockResolvedValue([]);

    await getPosts(makeSettings());

    expect(clientGet).toHaveBeenCalledWith('/posts.json', {
      tags: '',
      page: '1',
      limit: '20',
      v2: 'true',
      mode: 'extended',
    }, expect.anything());
  });

  it('maps raw v2 posts into the legacy Post shape', async () => {
    const raw = makeRawPost();
    clientGet.mockResolvedValue([raw]);

    const posts = await getPosts(makeSettings(), 'fox', 1, 20);

    expect(posts).toHaveLength(1);
    expect(posts[0].id).toBe(raw.id);
    expect(posts[0].file.ext).toBe('png');
    expect(posts[0].score.total).toBe(3963);
  });

  it('returns an empty array when the api returns no posts', async () => {
    clientGet.mockResolvedValue([]);
    const posts = await getPosts(makeSettings());
    expect(posts).toEqual([]);
  });

  it('propagates client errors to the caller', async () => {
    clientGet.mockRejectedValue(new Error('boom'));
    await expect(getPosts(makeSettings())).rejects.toBeDefined();
  });
});
