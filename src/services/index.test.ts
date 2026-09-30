import { describe, it, expect } from 'vitest';
import * as Services from './index';

describe('services barrel export', () => {
  it('exposes the typed client and request helpers', () => {
    expect(typeof Services.client.get).toBe('function');
    expect(typeof Services.buildApiUrl).toBe('function');
    expect(typeof Services.parseApiError).toBe('function');
    expect(typeof Services.ProxyAuthenticationError).toBe('function');
  });

  it('exposes the domain modules', () => {
    expect(typeof Services.getPosts).toBe('function');
    expect(typeof Services.mapV2Post).toBe('function');
    expect(typeof Services.getComments).toBe('function');
    expect(typeof Services.getUser).toBe('function');
    expect(typeof Services.getUserByName).toBe('function');
    expect(typeof Services.getUsersByIds).toBe('function');
    expect(typeof Services.searchTags).toBe('function');
  });

  it('no longer exposes the monolithic api object', () => {
    expect('api' in Services).toBe(false);
  });
});
