import { describe, it, expect } from 'vitest';
import { APP_CONFIG, RATING, TAG_STYLES, type TagCategory } from './index';

describe('APP_CONFIG', () => {
  it('exposes a stable name and version', () => {
    expect(APP_CONFIG.name).toBe('e6client');
    expect(APP_CONFIG.version).toBe('1.2.0');
  });

  it('has sane api defaults', () => {
    expect(APP_CONFIG.api.baseUrl).toBe('https://e621.net');
    expect(APP_CONFIG.api.timeout).toBeGreaterThan(0);
    expect(APP_CONFIG.api.defaultPageSize).toBeGreaterThan(0);
    expect(APP_CONFIG.api.maxRetries).toBeGreaterThanOrEqual(0);
  });

  it('has ui config with breakpoints in ascending order', () => {
    const { sm, md, lg, xl } = APP_CONFIG.ui.breakpoints;
    expect(sm).toBeLessThan(md);
    expect(md).toBeLessThan(lg);
    expect(lg).toBeLessThan(xl);
  });

  it('uses a non-empty settings storage key', () => {
    expect(APP_CONFIG.storage.settingsKey).toBeTruthy();
  });
});

describe('RATING', () => {
  it('maps rating codes to single letters', () => {
    expect(RATING.SAFE).toBe('s');
    expect(RATING.QUESTIONABLE).toBe('q');
    expect(RATING.EXPLICIT).toBe('e');
  });

  it('has human-readable labels for every code', () => {
    expect(RATING.labels.s).toBe('Safe');
    expect(RATING.labels.q).toBe('Questionable');
    expect(RATING.labels.e).toBe('Explicit');
  });
});

describe('TAG_STYLES', () => {
  it('has a style string for every tag category', () => {
    const categories: TagCategory[] = [
      'artist',
      'character',
      'species',
      'general',
      'meta',
      'lore',
      'invalid',
    ];
    for (const cat of categories) {
      expect(TAG_STYLES.category[cat]).toBeTruthy();
    }
  });

  it('has rating dot colors for s, q, e plus a default', () => {
    expect(TAG_STYLES.ratingDot.s).toBeTruthy();
    expect(TAG_STYLES.ratingDot.q).toBeTruthy();
    expect(TAG_STYLES.ratingDot.e).toBeTruthy();
    expect(TAG_STYLES.ratingDot.default).toBeTruthy();
  });
});
