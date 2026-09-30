import type { Settings, Post, Score, Tags, PostFlags, Rating } from '../types';
import { APP_CONFIG } from '../config';
import { client } from './client';

export interface RawPostV2 {
  id: number;
  created_at: string;
  updated_at: string;
  change_seq: number;
  files: {
    meta: { md5: string; ext: string; size: number; duration: number | null; has_sample: boolean };
    original: { width: number; height: number; url: string | null };
    preview: { width: number; height: number; jpg: string | null; webp: string | null };
    sample: { width: number; height: number; jpg: string | null; webp: string | null };
  };
  uploader_id: number;
  uploader_name: string;
  approver_id: number | null;
  stats: {
    score: Score;
    fav_count: number;
    is_favorited: boolean;
    comment_count: number;
  };
  flags: PostFlags;
  has: {
    parent: boolean;
    children: boolean;
    active_children: boolean;
    notes: boolean;
    sample: boolean;
  };
  relationships: { parent_id: number | null; children: number[] };
  pools: number[];
  rating: Rating;
  locked_tags: string[];
  sources: string[];
  description: string;
  tags: Tags;
}

export function mapV2Post(raw: RawPostV2): Post {
  return {
    id: raw.id,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    change_seq: raw.change_seq,
    file: {
      width: raw.files.original.width,
      height: raw.files.original.height,
      ext: raw.files.meta.ext,
      size: raw.files.meta.size,
      md5: raw.files.meta.md5,
      url: raw.files.original.url,
    },
    preview: {
      width: raw.files.preview.width,
      height: raw.files.preview.height,
      url: raw.files.preview.jpg ?? raw.files.preview.webp,
    },
    sample: {
      has: raw.has.sample,
      width: raw.files.sample.width,
      height: raw.files.sample.height,
      url: raw.files.sample.jpg ?? raw.files.sample.webp,
      alternates: {},
    },
    score: raw.stats.score,
    tags: raw.tags,
    locked_tags: raw.locked_tags,
    flags: raw.flags,
    rating: raw.rating,
    fav_count: raw.stats.fav_count,
    sources: raw.sources,
    pools: raw.pools,
    relationships: {
      parent_id: raw.relationships.parent_id,
      has_children: raw.has.children,
      has_active_children: raw.has.active_children,
      children: raw.relationships.children,
    },
    approver_id: raw.approver_id,
    uploader_id: raw.uploader_id,
    description: raw.description,
    comment_count: raw.stats.comment_count,
    is_favorited: raw.stats.is_favorited,
    has_notes: raw.has.notes,
    duration: raw.files.meta.duration,
  };
}

export async function getPosts(
  settings: Settings,
  tags = '',
  page = 1,
  limit: number = APP_CONFIG.api.defaultPageSize,
): Promise<Post[]> {
  const data = await client.get<RawPostV2[]>('/posts.json', {
    tags,
    page: String(page),
    limit: String(limit),
    v2: 'true',
    mode: 'extended',
  }, settings);
  return data.map(mapV2Post);
}
