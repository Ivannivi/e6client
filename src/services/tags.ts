import type { Settings, TagSuggestion } from '../types';
import { client } from './client';

export async function searchTags(settings: Settings, query: string): Promise<TagSuggestion[]> {
  try {
    return await client.get<TagSuggestion[]>(
      '/tags/autocomplete.json',
      {
        'search[name_matches]': query,
        expiry: '7',
      },
      settings,
      { retries: 0 },
    );
  } catch {
    return [];
  }
}
