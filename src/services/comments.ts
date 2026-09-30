import type { Settings, Comment } from '../types';
import { client } from './client';

export async function getComments(settings: Settings, postId: number): Promise<Comment[]> {
  try {
    const data = await client.get<Comment[] | { comments?: Comment[] }>(
      '/comments.json',
      {
        'search[post_id]': String(postId),
        group_by: 'comment',
        limit: '30',
      },
      settings,
      { retries: 0 },
    );
    if (Array.isArray(data)) return data;
    return data?.comments ?? [];
  } catch {
    return [];
  }
}
