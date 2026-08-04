import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Post } from '../types';

const DB_NAME = 'e6client-db';
const DB_VERSION = 1;

interface E6ClientDB extends DBSchema {
  posts: {
    key: string;
    value: {
      queryKey: string;
      posts: Post[];
      cachedAt: number;
    };
    indexes: { byCachedAt: number };
  };
  metadata: {
    key: string;
    value: unknown;
  };
}

let dbPromise: Promise<IDBPDatabase<E6ClientDB>> | null = null;

function getDB(): Promise<IDBPDatabase<E6ClientDB>> {
  if (!dbPromise) {
    dbPromise = openDB<E6ClientDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('posts')) {
          const postsStore = db.createObjectStore('posts', { keyPath: 'queryKey' });
          postsStore.createIndex('byCachedAt', 'cachedAt');
        }
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata');
        }
      },
    });
  }
  return dbPromise;
}

export async function cachePosts(queryKey: string, posts: Post[]): Promise<void> {
  if (!queryKey) return;
  const db = await getDB();
  await db.put('posts', { queryKey, posts, cachedAt: Date.now() });
}

export async function getCachedPosts(queryKey: string): Promise<Post[] | null> {
  if (!queryKey) return null;
  const db = await getDB();
  const entry = await db.get('posts', queryKey);
  return entry ? entry.posts : null;
}

export async function clearCache(): Promise<void> {
  const db = await getDB();
  await db.clear('posts');
  await db.clear('metadata');
}

export async function clearExpiredCache(maxAgeMs: number): Promise<void> {
  const cutoff = Date.now() - maxAgeMs;
  const db = await getDB();
  const tx = db.transaction('posts', 'readwrite');
  const index = tx.store.index('byCachedAt');
  const expiredKeys: string[] = [];

  let cursor = await index.openCursor();
  while (cursor) {
    if (cursor.value.cachedAt < cutoff) {
      expiredKeys.push(cursor.primaryKey);
    }
    cursor = await cursor.continue();
  }

  await Promise.all(expiredKeys.map((key) => tx.store.delete(key)));
  await tx.done;
}
