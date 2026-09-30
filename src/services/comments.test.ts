import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getComments } from './comments';
import { makeSettings, makeComment } from '../test/factories';

const { clientGet } = vi.hoisted(() => ({ clientGet: vi.fn() }));

vi.mock('./client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./client')>()),
  client: { get: clientGet },
}));

beforeEach(() => {
  clientGet.mockReset();
});

describe('getComments', () => {
  it('requests the comments endpoint filtered by post', async () => {
    clientGet.mockResolvedValue([]);
    const settings = makeSettings();

    await getComments(settings, 42);

    expect(clientGet).toHaveBeenCalledWith('/comments.json', {
      'search[post_id]': '42',
      group_by: 'comment',
      limit: '30',
    }, settings, { retries: 0 });
  });

  it('returns comments from the comments wrapper', async () => {
    const comment = makeComment();
    clientGet.mockResolvedValue({ comments: [comment] });
    const result = await getComments(makeSettings(), 1);
    expect(result).toEqual([comment]);
  });

  it('returns the raw array when there is no comments wrapper', async () => {
    const comments = [makeComment(), makeComment({ id: 2 })];
    clientGet.mockResolvedValue(comments);
    const result = await getComments(makeSettings(), 1);
    expect(result).toHaveLength(2);
  });

  it('returns an empty array on error', async () => {
    clientGet.mockRejectedValue(new Error('boom'));
    const result = await getComments(makeSettings(), 1);
    expect(result).toEqual([]);
  });
});
