import { describe, it, expect } from 'vitest';
import * as Services from './index';

describe('services barrel export', () => {
  it('exports api', () => {
    expect(Services.api).toBeDefined();
    expect(typeof Services.api.getPosts).toBe('function');
  });

  it('exports parseApiError', () => {
    expect(Services.parseApiError).toBeDefined();
    expect(typeof Services.parseApiError).toBe('function');
  });
});
