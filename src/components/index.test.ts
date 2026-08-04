import { describe, it, expect } from 'vitest';
import * as Components from './index';

describe('components barrel export', () => {
  it('exports PostCard', () => {
    expect(Components.PostCard).toBeDefined();
  });

  it('exports PostDetail', () => {
    expect(Components.PostDetail).toBeDefined();
  });

  it('exports PostListItem', () => {
    expect(Components.PostListItem).toBeDefined();
  });

  it('exports SettingsModal', () => {
    expect(Components.SettingsModal).toBeDefined();
  });

  it('exports ToastContainer', () => {
    expect(Components.ToastContainer).toBeDefined();
  });

  it('exports SearchHistory', () => {
    expect(Components.SearchHistory).toBeDefined();
  });

  it('exports ViewModeToggle', () => {
    expect(Components.ViewModeToggle).toBeDefined();
  });

  it('exports QuickActions', () => {
    expect(Components.QuickActions).toBeDefined();
  });

  it('exports KeyboardShortcutsHelp', () => {
    expect(Components.KeyboardShortcutsHelp).toBeDefined();
  });

  it('exports Ripple', () => {
    expect(Components.Ripple).toBeDefined();
  });
});
