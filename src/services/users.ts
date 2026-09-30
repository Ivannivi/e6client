import type { Settings, User } from '../types';
import { client } from './client';

type UserListResponse = User[] | { users?: User[] };

function unwrapUsers(data: UserListResponse): User[] {
  return Array.isArray(data) ? data : data.users || [];
}

export async function getUser(settings: Settings, userId: number): Promise<User | null> {
  try {
    const data = await client.get<User | { user?: User }>(
      `/users/${userId}.json`,
      {},
      settings,
      { retries: 0 },
    );
    if (!data) return null;
    return 'user' in data && data.user ? data.user : (data as User);
  } catch {
    return null;
  }
}

export async function getUserByName(settings: Settings, username: string): Promise<User | null> {
  try {
    const data = await client.get<UserListResponse>(
      '/users.json',
      { 'search[name_matches]': username },
      settings,
      { retries: 0 },
    );
    const users = unwrapUsers(data);
    if (users.length === 0) return null;

    const exact = users.find(
      (u) => u.name.toLowerCase() === username.toLowerCase()
    );
    return exact || users[0];
  } catch {
    return null;
  }
}

export async function getUsersByIds(settings: Settings, userIds: number[]): Promise<User[]> {
  if (userIds.length === 0) return [];

  try {
    const data = await client.get<UserListResponse>(
      '/users.json',
      { 'search[id]': userIds.join(',') },
      settings,
      { retries: 0 },
    );
    return unwrapUsers(data);
  } catch {
    return [];
  }
}
