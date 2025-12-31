export type Rating = 's' | 'q' | 'e';

export interface FileInfo {
  width: number;
  height: number;
  ext: string;
  size: number;
  md5: string;
  url: string | null;
}

export interface PreviewInfo {
  width: number;
  height: number;
  url: string | null;
}

export interface SampleInfo {
  has: boolean;
  height: number;
  width: number;
  url: string | null;
  alternates: Record<string, unknown>;
}

export interface Score {
  up: number;
  down: number;
  total: number;
}

export interface Tags {
  general: string[];
  species: string[];
  character: string[];
  artist: string[];
  invalid: string[];
  meta: string[];
  lore: string[];
}

export interface PostFlags {
  pending: boolean;
  flagged: boolean;
  note_locked: boolean;
  status_locked: boolean;
  rating_locked: boolean;
  deleted: boolean;
}

export interface Relationships {
  parent_id: number | null;
  has_children: boolean;
  has_active_children: boolean;
  children: number[];
}

export interface Post {
  id: number;
  created_at: string;
  updated_at: string;
  file: FileInfo;
  preview: PreviewInfo;
  sample: SampleInfo;
  score: Score;
  tags: Tags;
  locked_tags: string[];
  change_seq: number;
  flags: PostFlags;
  rating: Rating;
  fav_count: number;
  sources: string[];
  pools: number[];
  relationships: Relationships;
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
  creator: string;
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

export interface TagSuggestion {
  id: number;
  name: string;
  post_count: number;
  category: number;
}

export interface Account {
  id: string;
  name: string; // Display name for the account
  username: string;
  apiKey: string;
  hostUrl: string; // Custom host URL (e.g., https://e621.net or https://e926.net)
}

export interface Settings {
  accounts: Account[];
  activeAccountId: string | null;
  proxyUrl: string;
  enableProxy: boolean;
  nsfwEnabled: boolean;
  safeMode: boolean;
  darkMode: boolean;
  blacklistedTags: string[];
}

export const createDefaultSettings = (): Settings => ({
  accounts: [],
  activeAccountId: null,
  proxyUrl: 'https://corsproxy.io/?',
  enableProxy: false,
  nsfwEnabled: false,
  safeMode: false,
  darkMode: true,
  blacklistedTags: [],
});

export const getActiveAccount = (settings: Settings): Account | null => {
  if (!settings.activeAccountId) return null;
  return settings.accounts.find((a) => a.id === settings.activeAccountId) || null;
};

export const createAccount = (partial: Partial<Account> = {}): Account => ({
  id: crypto.randomUUID(),
  name: partial.name || 'New Account',
  username: partial.username || '',
  apiKey: partial.apiKey || '',
  hostUrl: partial.hostUrl || 'https://e621.net',
});
