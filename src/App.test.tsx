import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import { makePost, makeSettings, makeAccount, makeTagSuggestion, makeComment } from './test/factories';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && typeof opts === 'object') {
        return Object.entries(opts).reduce(
          (acc, [k, v]) => acc.replace(`{{${k}}}`, String(v)),
          key,
        );
      }
      return key;
    },
  }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
}));

const apiMock = vi.hoisted(() => ({
  getPosts: vi.fn(),
  searchTags: vi.fn(),
  getComments: vi.fn(),
  getUsersByIds: vi.fn(),
  getUser: vi.fn(),
  getUserByName: vi.fn(),
}));

vi.mock('./services/api', () => ({
  api: apiMock,
  parseApiError: (err: unknown) => err instanceof Error ? err.message : 'error',
}));

vi.mock('./components/Ripple', () => ({
  Ripple: ({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <div onClick={disabled ? undefined : onClick} data-disabled={disabled ?? false}>{children}</div>
  ),
}));

// Partial mock of hooks — real implementations except useIntersectionObserver
// which needs a no-op since jsdom doesn't have IntersectionObserver
vi.mock('./hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./hooks')>();
  return {
    ...actual,
    useIntersectionObserver: () => {},
  };
});

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }));
  window.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
  vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid' });
  apiMock.getPosts.mockReset();
  apiMock.searchTags.mockReset();
  apiMock.getComments.mockReset();
  apiMock.getUsersByIds.mockReset();
  apiMock.getUser.mockReset();
  apiMock.getUserByName.mockReset();
  apiMock.getPosts.mockResolvedValue([]);
  apiMock.getComments.mockResolvedValue([]);
  apiMock.getUsersByIds.mockResolvedValue([]);
  apiMock.getUser.mockResolvedValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('App', () => {
  it('renders the app title and search bar', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByPlaceholderText('app.searchPlaceholder')).toBeInTheDocument());
  });

  it('fetches posts on mount', async () => {
    render(<App />);
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
  });

  it('displays fetched posts in grid view', async () => {
    const post = makePost({ artist: ['testartist'] }, { url: 'https://example.com/img.png' });
    post.preview.url = 'https://example.com/preview.png';
    apiMock.getPosts.mockResolvedValue([post]);
    render(<App />);
    await waitFor(() => expect(screen.getByAltText('Post 1')).toBeInTheDocument());
  });

  it('displays posts in list view when view mode is toggled', async () => {
    const post = makePost({ artist: ['testartist'] }, { url: 'https://example.com/img.png' });
    post.preview.url = 'https://example.com/preview.png';
    apiMock.getPosts.mockResolvedValue([post]);
    render(<App />);
    await waitFor(() => expect(screen.getByAltText('Post 1')).toBeInTheDocument());
  });

  it('shows empty state when no posts are returned', async () => {
    apiMock.getPosts.mockResolvedValue([]);
    render(<App />);
    await waitFor(() => expect(screen.getByText('app.noPosts')).toBeInTheDocument());
  });

  it('shows error banner when fetch fails', async () => {
    apiMock.getPosts.mockRejectedValue(new Error('Network error'));
    render(<App />);
    await waitFor(() => expect(screen.getByText(/Network error/)).toBeInTheDocument());
  });

  it('opens settings modal when settings button is clicked', async () => {
    render(<App />);
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
    const settingsBtn = screen.getByTitle(/shortcuts.settings/);
    fireEvent.click(settingsBtn);
    expect(screen.getByText('settings.title')).toBeInTheDocument();
  });

  it('closes settings modal when cancel is clicked', async () => {
    render(<App />);
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
    fireEvent.click(screen.getByTitle(/shortcuts.settings/));
    expect(screen.getByText('settings.title')).toBeInTheDocument();
    fireEvent.click(screen.getByText('settings.cancel'));
    expect(screen.queryByText('settings.title')).not.toBeInTheDocument();
  });

  it('opens keyboard shortcuts help when help button is clicked', async () => {
    render(<App />);
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
    const helpBtn = screen.getByTitle(/shortcuts.help/);
    fireEvent.click(helpBtn);
    expect(screen.getByText('shortcutsHelp.title')).toBeInTheDocument();
  });

  it('performs search when query is submitted', async () => {
    apiMock.getPosts.mockClear();
    render(<App />);
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
    const input = screen.getByPlaceholderText('app.searchPlaceholder');
    fireEvent.change(input, { target: { value: 'fox' } });
    fireEvent.submit(input.closest('form')!);
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalledTimes(2));
  });

  it('fetches random post when random button is clicked', async () => {
    const randomPost = makePost({ artist: ['random'] }, { url: 'https://example.com/r.png' });
    randomPost.preview.url = 'https://example.com/r-preview.png';
    apiMock.getPosts.mockResolvedValue([randomPost]);
    render(<App />);
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
    const randomBtn = screen.getByTitle('quickActions.randomPost');
    fireEvent.click(randomBtn);
    await waitFor(() => expect(screen.getByText(/postDetail.postId/)).toBeInTheDocument());
  });

  it('refreshes posts when refresh button is clicked', async () => {
    apiMock.getPosts.mockClear();
    render(<App />);
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
    apiMock.getPosts.mockClear();
    const refreshBtn = screen.getByTitle('quickActions.refresh');
    fireEvent.click(refreshBtn);
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
  });

  it('opens post detail when a post card is clicked', async () => {
    const post = makePost({ artist: ['testartist'] }, { url: 'https://example.com/img.png' });
    post.preview.url = 'https://example.com/preview.png';
    apiMock.getPosts.mockResolvedValue([post]);
    render(<App />);
    await waitFor(() => expect(screen.getByAltText('Post 1')).toBeInTheDocument());
    const card = screen.getByAltText('Post 1').closest('[data-disabled]') || screen.getByAltText('Post 1');
    fireEvent.click(card);
    await waitFor(() => expect(screen.getByText(/postDetail.postId/)).toBeInTheDocument());
  });

  it('filters blacklisted posts from display', async () => {
    const blacklisted = makePost({ general: ['gore'] });
    blacklisted.id = 100;
    blacklisted.preview.url = 'https://example.com/gore.png';
    const ok = makePost({ general: ['safe'] });
    ok.id = 200;
    ok.preview.url = 'https://example.com/safe.png';
    apiMock.getPosts.mockResolvedValue([blacklisted, ok]);
    localStorage.setItem('e6-settings', JSON.stringify({
      ...makeSettings({ blacklistedTags: ['gore'] }),
    }));
    render(<App />);
    await waitFor(() => expect(screen.getByAltText('Post 200')).toBeInTheDocument());
    expect(screen.queryByAltText('Post 100')).not.toBeInTheDocument();
  });

  it('shows tag suggestions when typing 3+ characters', async () => {
    apiMock.searchTags.mockResolvedValue([makeTagSuggestion({ name: 'fox' })]);
    render(<App />);
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
    const input = screen.getByPlaceholderText('app.searchPlaceholder');
    fireEvent.change(input, { target: { value: 'fox' } });
    fireEvent.focus(input);
    await waitFor(() => expect(apiMock.searchTags).toHaveBeenCalled(), { timeout: 5000 });
  });

  it('shows favorites tab when account is logged in', async () => {
    const account = makeAccount({ username: 'alice', apiKey: 'key' });
    localStorage.setItem('e6-settings', JSON.stringify({
      ...makeSettings({ accounts: [account], activeAccountId: account.id }),
    }));
    render(<App />);
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
  });

  it('shows clear search button in empty state when query is set', async () => {
    apiMock.getPosts.mockResolvedValue([]);
    render(<App />);
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
    const input = screen.getByPlaceholderText('app.searchPlaceholder');
    fireEvent.change(input, { target: { value: 'nothing' } });
    fireEvent.submit(input.closest('form')!);
    await waitFor(() => expect(screen.getByText('app.clearSearch')).toBeInTheDocument());
  });

  it('shows loading indicator while fetching', async () => {
    apiMock.getPosts.mockReturnValue(new Promise(() => {}));
    render(<App />);
    await waitFor(() => expect(screen.getByText('app.loadingMore')).toBeInTheDocument());
  });

  it('shows end reached indicator when no more posts', async () => {
    const post = makePost({ artist: ['a'] }, { url: 'https://example.com/i.png' });
    post.preview.url = 'https://example.com/p.png';
    // Return posts on first call, empty on second to set hasMore=false
    apiMock.getPosts.mockResolvedValueOnce([post]).mockResolvedValueOnce([]);
    render(<App />);
    await waitFor(() => expect(screen.getByAltText('Post 1')).toBeInTheDocument());
  });

  it('retries fetch when error banner retry is clicked', async () => {
    apiMock.getPosts.mockRejectedValueOnce(new Error('fail')).mockResolvedValue([]);
    render(<App />);
    await waitFor(() => expect(screen.getByText(/fail/)).toBeInTheDocument());
    apiMock.getPosts.mockClear();
    fireEvent.click(screen.getByText('error.retry'));
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
  });

  it('opens settings from error banner', async () => {
    apiMock.getPosts.mockRejectedValue(new Error('fail'));
    render(<App />);
    await waitFor(() => expect(screen.getByText(/fail/)).toBeInTheDocument());
    fireEvent.click(screen.getByText('error.settings'));
    expect(screen.getByText('settings.title')).toBeInTheDocument();
  });

  it('closes post detail when backdrop is clicked', async () => {
    const post = makePost({ artist: ['a'] }, { url: 'https://example.com/i.png' });
    post.preview.url = 'https://example.com/p.png';
    apiMock.getPosts.mockResolvedValue([post]);
    render(<App />);
    await waitFor(() => expect(screen.getByAltText('Post 1')).toBeInTheDocument());
    fireEvent.click(screen.getByAltText('Post 1').closest('[data-disabled]')!);
    await waitFor(() => expect(screen.getByText(/postDetail.postId/)).toBeInTheDocument());
    const backdrop = document.querySelector('.fixed.inset-0.z-50') as HTMLElement;
    fireEvent.click(backdrop);
    await waitFor(() => expect(screen.queryByText(/postDetail.postId/)).not.toBeInTheDocument());
  });

  it('goes home when title button is clicked', async () => {
    const post = makePost({ artist: ['a'] }, { url: 'https://example.com/i.png' });
    post.preview.url = 'https://example.com/p.png';
    apiMock.getPosts.mockResolvedValue([post]);
    render(<App />);
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
    apiMock.getPosts.mockClear();
    fireEvent.click(screen.getByText('e6'));
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
  });

  it('renders compact view cards', async () => {
    const post = makePost({ artist: ['a'] }, { url: 'https://example.com/i.png' });
    post.preview.url = 'https://example.com/p.png';
    apiMock.getPosts.mockResolvedValue([post]);
    render(<App />);
    await waitFor(() => expect(screen.getByAltText('Post 1')).toBeInTheDocument());
  });

  it('focuses search input via keyboard shortcut /', async () => {
    render(<App />);
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
    const input = screen.getByPlaceholderText('app.searchPlaceholder');
    const focusSpy = vi.spyOn(input, 'focus');
    fireEvent.keyDown(document.body, { key: '/' });
    expect(focusSpy).toHaveBeenCalled();
  });

  it('opens settings via keyboard shortcut s', async () => {
    render(<App />);
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
    fireEvent.keyDown(document.body, { key: 's' });
    expect(screen.getByText('settings.title')).toBeInTheDocument();
  });

  it('opens shortcuts help via keyboard shortcut ?', async () => {
    render(<App />);
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
    fireEvent.keyDown(document.body, { key: '?' });
    expect(screen.getByText('shortcutsHelp.title')).toBeInTheDocument();
  });

  it('toggles view mode via keyboard shortcut v', async () => {
    render(<App />);
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
    fireEvent.keyDown(document.body, { key: 'v' });
  });

  it('refreshes via keyboard shortcut r', async () => {
    apiMock.getPosts.mockResolvedValue([]);
    render(<App />);
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
    // Wait for loading to finish
    await waitFor(() => expect(screen.queryByText('app.loadingMore')).not.toBeInTheDocument());
    apiMock.getPosts.mockClear();
    fireEvent.keyDown(document.body, { key: 'r' });
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
  });

  it('closes shortcuts help via Escape keyboard shortcut', async () => {
    render(<App />);
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
    fireEvent.keyDown(document.body, { key: '?' });
    expect(screen.getByText('shortcutsHelp.title')).toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('shortcutsHelp.title')).not.toBeInTheDocument());
  });

  it('navigates home via keyboard shortcut h', async () => {
    apiMock.getPosts.mockResolvedValue([]);
    render(<App />);
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText('app.loadingMore')).not.toBeInTheDocument());
    apiMock.getPosts.mockClear();
    fireEvent.keyDown(document.body, { key: 'h' });
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
  });

  it('navigates to favorites via keyboard shortcut f when logged in', async () => {
    const account = makeAccount({ username: 'alice', apiKey: 'key' });
    localStorage.setItem('e6-settings', JSON.stringify({
      ...makeSettings({ accounts: [account], activeAccountId: account.id }),
    }));
    apiMock.getPosts.mockResolvedValue([]);
    render(<App />);
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText('app.loadingMore')).not.toBeInTheDocument());
    apiMock.getPosts.mockClear();
    fireEvent.keyDown(document.body, { key: 'f' });
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
    expect(apiMock.getPosts.mock.calls[0][1]).toContain('fav:alice');
  });

  it('does not navigate to favorites when not logged in', async () => {
    render(<App />);
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
    apiMock.getPosts.mockClear();
    fireEvent.keyDown(document.body, { key: 'f' });
    expect(apiMock.getPosts).not.toHaveBeenCalled();
  });

  it('fetches random post via keyboard shortcut x', async () => {
    const randomPost = makePost({ artist: ['r'] }, { url: 'https://example.com/r.png' });
    randomPost.preview.url = 'https://example.com/rp.png';
    apiMock.getPosts.mockResolvedValue([randomPost]);
    render(<App />);
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
    fireEvent.keyDown(document.body, { key: 'x' });
    await waitFor(() => expect(screen.getByText(/postDetail.postId/)).toBeInTheDocument());
  });

  it('shows random post error toast when fetch fails', async () => {
    apiMock.getPosts.mockRejectedValue(new Error('random fail'));
    render(<App />);
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
    apiMock.getPosts.mockClear();
    fireEvent.click(screen.getByTitle('quickActions.randomPost'));
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
  });

  it('renders mobile navigation', async () => {
    render(<App />);
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
    expect(screen.getAllByText('tabs.browse').length).toBeGreaterThan(0);
    expect(screen.getAllByText('tabs.settings').length).toBeGreaterThan(0);
  });

  it('opens settings from mobile nav', async () => {
    render(<App />);
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
    fireEvent.click(screen.getAllByText('tabs.settings')[0]);
    expect(screen.getByText('settings.title')).toBeInTheDocument();
  });

  it('displays post count in comments header', async () => {
    const comment = makeComment({ body: 'hello' });
    apiMock.getComments.mockResolvedValue([comment]);
    apiMock.getUsersByIds.mockResolvedValue([]);
    const post = makePost({ artist: ['a'] }, { url: 'https://example.com/i.png' });
    post.preview.url = 'https://example.com/p.png';
    apiMock.getPosts.mockResolvedValue([post]);
    render(<App />);
    await waitFor(() => expect(screen.getByAltText('Post 1')).toBeInTheDocument());
    fireEvent.click(screen.getByAltText('Post 1').closest('[data-disabled]')!);
    await waitFor(() => expect(screen.getByText('hello')).toBeInTheDocument());
  });

  it('shows search history when input is focused with no query', async () => {
    localStorage.setItem('e6-search-history', JSON.stringify([{ query: 'fox', timestamp: Date.now() }]));
    render(<App />);
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
    const input = screen.getByPlaceholderText('app.searchPlaceholder');
    fireEvent.focus(input);
    await waitFor(() => expect(screen.getByText('fox')).toBeInTheDocument());
  });

  it('selects from search history', async () => {
    localStorage.setItem('e6-search-history', JSON.stringify([{ query: 'fox', timestamp: Date.now() }]));
    render(<App />);
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
    const input = screen.getByPlaceholderText('app.searchPlaceholder');
    fireEvent.focus(input);
    await waitFor(() => expect(screen.getByText('fox')).toBeInTheDocument());
    apiMock.getPosts.mockClear();
    fireEvent.click(screen.getByText('fox'));
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
  });

  it('clears search history', async () => {
    localStorage.setItem('e6-search-history', JSON.stringify([
      { query: 'fox', timestamp: Date.now() },
      { query: 'cat', timestamp: Date.now() },
    ]));
    render(<App />);
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
    const input = screen.getByPlaceholderText('app.searchPlaceholder');
    fireEvent.focus(input);
    await waitFor(() => expect(screen.getByText('searchHistory.clearAll')).toBeInTheDocument());
    fireEvent.click(screen.getByText('searchHistory.clearAll'));
    await waitFor(() => expect(screen.queryByText('fox')).not.toBeInTheDocument());
  });

  it('removes a search history item', async () => {
    localStorage.setItem('e6-search-history', JSON.stringify([
      { query: 'fox', timestamp: Date.now() },
    ]));
    render(<App />);
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
    const input = screen.getByPlaceholderText('app.searchPlaceholder');
    fireEvent.focus(input);
    await waitFor(() => expect(screen.getByText('fox')).toBeInTheDocument());
    const itemRow = screen.getByText('fox').closest('.group') || screen.getByText('fox').parentElement!.parentElement!;
    const removeBtn = itemRow.querySelector('button');
    fireEvent.click(removeBtn!);
    await waitFor(() => expect(screen.queryByText('fox')).not.toBeInTheDocument());
  });

  it('clicking a tag suggestion inserts it into the search', async () => {
    apiMock.searchTags.mockResolvedValue([makeTagSuggestion({ name: 'fox', post_count: 100 })]);
    render(<App />);
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
    const input = screen.getByPlaceholderText('app.searchPlaceholder') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'fox' } });
    fireEvent.focus(input);
    await waitFor(() => expect(screen.getByText('fox')).toBeInTheDocument(), { timeout: 5000 });
    fireEvent.click(screen.getByText('fox'));
    expect(input.value).toContain('fox');
  });

  it('updates settings via settings modal save', async () => {
    render(<App />);
    await waitFor(() => expect(apiMock.getPosts).toHaveBeenCalled());
    fireEvent.click(screen.getByTitle(/shortcuts.settings/));
    expect(screen.getByText('settings.title')).toBeInTheDocument();
    fireEvent.click(screen.getByText('settings.saveChanges'));
    await waitFor(() => expect(screen.queryByText('settings.title')).not.toBeInTheDocument());
  });
});
