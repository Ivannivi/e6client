export interface E6File {
  width: number;
  height: number;
  ext: string;
  size: number;
  md5: string;
  url: string | null;
}

export interface E6Score {
  up: number;
  down: number;
  total: number;
}

export interface E6Tags {
  general: string[];
  species: string[];
  character: string[];
  artist: string[];
  invalid: string[];
  meta: string[];
  lore: string[];
}

export interface Post {
  id: number;
  created_at: string;
  updated_at: string;
  file: E6File;
  preview: {
    width: number;
    height: number;
    url: string | null;
  };
  sample: {
    has: boolean;
    height: number;
    width: number;
    url: string | null;
    alternates: any;
  };
  score: E6Score;
  tags: E6Tags;
  locked_tags: string[];
  change_seq: number;
  flags: {
    pending: boolean;
    flagged: boolean;
    note_locked: boolean;
    status_locked: boolean;
    rating_locked: boolean;
    deleted: boolean;
  };
  rating: 's' | 'q' | 'e';
  fav_count: number;
  sources: string[];
  pools: number[];
  relationships: {
    parent_id: number | null;
    has_children: boolean;
    has_active_children: boolean;
    children: number[];
  };
  approver_id: number | null;
  uploader_id: number;
  description: string;
  comment_count: number;
  is_favorited: boolean;
  has_notes: boolean;
  duration: number | null;
}

export interface Comment {
  id: number;
  post_id: number;
  creator_id: number;
  creator: string; // author name
  body: string;
  score: number;
  created_at: string;
  updated_at: string;
  is_hidden: boolean;
}

export interface User {
  id: number;
  name: string;
  level: number;
  blacklisted_tags: string;
}

export interface AppSettings {
  username: string;
  apiKey: string;
  proxyUrl: string; // Acts as Base URL (e.g., local proxy or e621.net)
  enableProxy: boolean;
  safeMode: boolean; // Blurs Q/E content
  darkMode: boolean;
  blacklistedTags: string[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  username: '',
  apiKey: '',
  proxyUrl: 'https://corsproxy.io/?',
  enableProxy: false, // Default disabled as requested
  safeMode: false,
  darkMode: true,
  blacklistedTags: [],
};