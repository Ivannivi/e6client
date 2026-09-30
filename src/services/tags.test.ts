import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchTags } from './tags';
import { makeSettings, makeTagSuggestion } from '../test/factories';

const { clientGet } = vi.hoisted(() => ({ clientGet: vi.fn() }));

vi.mock('./client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./client')>()),
  client: { get: clientGet },
}));

beforeEach(() => {
  clientGet.mockReset();
});

describe('searchTags', () => {
  it('requests the tag autocomplete endpoint', async () => {
    clientGet.mockResolvedValue([]);
    const settings = makeSettings();

    await searchTags(settings, 'fo');

    expect(clientGet).toHaveBeenCalledWith('/tags/autocomplete.json', {
      'search[name_matches]': 'fo',
      expiry: '7',
    }, settings, { retries: 0 });
  });

  it('returns tag suggestions on success', async () => {
    const tag = makeTagSuggestion({ name: 'fox' });
    clientGet.mockResolvedValue([tag]);
    const result = await searchTags(makeSettings(), 'fo');
    expect(result).toEqual([tag]);
  });

  it('returns an empty array on error', async () => {
    clientGet.mockRejectedValue(new Error('boom'));
    const result = await searchTags(makeSettings(), 'fo');
    expect(result).toEqual([]);
  });
});
