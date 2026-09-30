import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUser, getUserByName, getUsersByIds } from './users';
import { makeSettings, makeUser } from '../test/factories';

const { clientGet } = vi.hoisted(() => ({ clientGet: vi.fn() }));

vi.mock('./client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./client')>()),
  client: { get: clientGet },
}));

beforeEach(() => {
  clientGet.mockReset();
});

describe('getUser', () => {
  it('requests the user endpoint by id', async () => {
    clientGet.mockResolvedValue(makeUser());
    const settings = makeSettings();

    await getUser(settings, 7);

    expect(clientGet).toHaveBeenCalledWith('/users/7.json', {}, settings, { retries: 0 });
  });

  it('returns the user object from the user wrapper', async () => {
    const user = makeUser();
    clientGet.mockResolvedValue({ user });
    const result = await getUser(makeSettings(), 1);
    expect(result).toEqual(user);
  });

  it('returns the raw data when there is no user wrapper', async () => {
    const user = makeUser();
    clientGet.mockResolvedValue(user);
    const result = await getUser(makeSettings(), 1);
    expect(result).toEqual(user);
  });

  it('returns null on error', async () => {
    clientGet.mockRejectedValue(new Error('boom'));
    const result = await getUser(makeSettings(), 1);
    expect(result).toBeNull();
  });
});

describe('getUserByName', () => {
  it('searches users by name', async () => {
    clientGet.mockResolvedValue([]);
    const settings = makeSettings();

    await getUserByName(settings, 'alice');

    expect(clientGet).toHaveBeenCalledWith('/users.json', {
      'search[name_matches]': 'alice',
    }, settings, { retries: 0 });
  });

  it('returns the exact name match when present', async () => {
    const exact = makeUser({ name: 'alice' });
    const other = makeUser({ id: 2, name: 'alicia' });
    clientGet.mockResolvedValue([other, exact]);
    const result = await getUserByName(makeSettings(), 'alice');
    expect(result?.name).toBe('alice');
  });

  it('falls back to the first user when no exact match', async () => {
    const users = [makeUser({ name: 'bob' })];
    clientGet.mockResolvedValue(users);
    const result = await getUserByName(makeSettings(), 'bobby');
    expect(result?.name).toBe('bob');
  });

  it('unwraps the users array from a wrapper response', async () => {
    const user = makeUser({ name: 'alice' });
    clientGet.mockResolvedValue({ users: [user] });
    const result = await getUserByName(makeSettings(), 'alice');
    expect(result?.name).toBe('alice');
  });

  it('returns null when no users are found', async () => {
    clientGet.mockResolvedValue([]);
    const result = await getUserByName(makeSettings(), 'nobody');
    expect(result).toBeNull();
  });

  it('returns null on error', async () => {
    clientGet.mockRejectedValue(new Error('boom'));
    const result = await getUserByName(makeSettings(), 'nobody');
    expect(result).toBeNull();
  });
});

describe('getUsersByIds', () => {
  it('returns an empty array without making a request when no ids are given', async () => {
    const result = await getUsersByIds(makeSettings(), []);
    expect(result).toEqual([]);
    expect(clientGet).not.toHaveBeenCalled();
  });

  it('searches users by id list', async () => {
    clientGet.mockResolvedValue([]);
    const settings = makeSettings();

    await getUsersByIds(settings, [1, 2]);

    expect(clientGet).toHaveBeenCalledWith('/users.json', {
      'search[id]': '1,2',
    }, settings, { retries: 0 });
  });

  it('returns users on success', async () => {
    const users = [makeUser(), makeUser({ id: 2 })];
    clientGet.mockResolvedValue(users);
    const result = await getUsersByIds(makeSettings(), [1, 2]);
    expect(result).toHaveLength(2);
  });

  it('unwraps the users array from a wrapper response', async () => {
    const users = [makeUser()];
    clientGet.mockResolvedValue({ users });
    const result = await getUsersByIds(makeSettings(), [1]);
    expect(result).toHaveLength(1);
  });

  it('returns an empty array on error', async () => {
    clientGet.mockRejectedValue(new Error('boom'));
    const result = await getUsersByIds(makeSettings(), [1]);
    expect(result).toEqual([]);
  });
});
