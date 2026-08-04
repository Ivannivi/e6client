import { useState, useEffect, useCallback, useRef, useMemo, FormEvent, Key } from 'react';
import { useTranslation } from 'react-i18next';
import type { Post, Settings, TagSuggestion } from './types';
import { getActiveAccount, isSafeProvider } from './types';
import { api, parseApiError } from './services/api';
import { PostCard } from './components/PostCard';
import { PostListItem } from './components/PostListItem';
import { PostDetail } from './components/PostDetail';
import { SettingsModal } from './components/SettingsModal';
import { ToastContainer } from './components/Toast';
import { SearchHistory } from './components/SearchHistory';
import { ViewModeToggle } from './components/ViewModeToggle';
import { QuickActions } from './components/QuickActions';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { useSettings } from './hooks/useSettings';
import { 
  useDebounce, 
  useColumnCount, 
  useIntersectionObserver,
  useSearchHistory,
  useKeyboardShortcuts,
  useToast,
  useViewMode,
} from './hooks';
import { isPostBlacklisted, distributeToColumns, cn } from './utils';
import { TAG_STYLES } from './config';
import { Ripple } from './components/Ripple';

type Tab = 'home' | 'favorites';

/*
 * Navigation stack: every forward navigation (search, tag tap, tab
 * switch, opening a post) pushes an entry here so hardware/gesture
 * back can unwind one step at a time - Android's back contract -
 * instead of exiting the app the moment the current screen doesn't
 * happen to be a post detail or settings modal.
 */
type NavEntry =
  | { type: 'browse'; tab: Tab; query: string }
  | { type: 'detail'; post: Post };

export default function App() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettings();
  const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory();
  const { toasts, success, error: showError, info, removeToast } = useToast();
  const { viewMode, setViewMode, toggleViewMode } = useViewMode();

  const [tab, setTab] = useState<Tab>('home');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const loaderRef = useRef<HTMLDivElement>(null);
  // Root entry always sits at the bottom - popping it back off means "go home", not "exit".
  const navStack = useRef<NavEntry[]>([{ type: 'browse', tab: 'home', query: '' }]);
  const debouncedQuery = useDebounce(query, 300);
  const numCols = useColumnCount();

  const fetchPosts = useCallback(
    // overrideTab/overrideQuery let navigation actions fetch with the
    // value they're *about* to set, instead of racing setTab/setQuery's
    // async state update (which this closure wouldn't see until next render).
    async (reset = false, overrideTab: Tab = tab, overrideQuery: string = query) => {
      if (loading || (!reset && !hasMore)) return;

      setLoading(true);
      if (reset) setError(null);

      try {
        let finalQuery = overrideQuery;

        if (overrideTab === 'favorites') {
          const activeAccount = getActiveAccount(settings);
          if (!activeAccount?.username) {
            throw new Error(t('app.usernameRequired'));
          }
          finalQuery = `fav:${activeAccount.username} ${overrideQuery}`;
        }

        const activeAccount = getActiveAccount(settings);
        if (activeAccount && isSafeProvider(activeAccount.hostUrl)) {
          finalQuery = `rating:s ${finalQuery}`.trim();
        }

        const currentPage = reset ? 1 : page;
        const fetched = await api.getPosts(settings, finalQuery, currentPage);

        setHasMore(fetched.length > 0);

        if (reset) {
          setPosts(fetched);
          setPage(2);
        } else {
          setPosts((prev) => {
            const existing = new Set(prev.map((p) => p.id));
            return [...prev, ...fetched.filter((p) => !existing.has(p.id))];
          });
          setPage((p) => p + 1);
        }
      } catch (err) {
        if (reset) setError(parseApiError(err));
      } finally {
        setLoading(false);
      }
    },
    [settings, query, page, loading, tab, hasMore]
  );

  useEffect(() => {
    fetchPosts(true, 'home', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Forward navigation to a (possibly new) tab/query - search submit, tag tap, tab switch.
  const navigate = useCallback((newTab: Tab, newQuery: string) => {
    navStack.current.push({ type: 'browse', tab: newTab, query: newQuery });
    setSelectedPost(null);
    setTab(newTab);
    setQuery(newQuery);
    setHasMore(true);
    fetchPosts(true, newTab, newQuery);
  }, [fetchPosts]);

  // Forward navigation into a post's detail view.
  const openDetail = useCallback((post: Post) => {
    navStack.current.push({ type: 'detail', post });
    setSelectedPost(post);
  }, []);

  // One step back through the stack - used by the hardware/gesture back
  // button, the detail view's close button, and Escape.
  const goBack = useCallback(() => {
    if (navStack.current.length <= 1) {
      if (window.Capacitor) {
        window.Capacitor.Plugins.App.exitApp();
      }
      return;
    }

    navStack.current.pop();
    const top = navStack.current[navStack.current.length - 1];

    if (top.type === 'detail') {
      setSelectedPost(top.post);
    } else {
      setSelectedPost(null);
      setTab(top.tab);
      setQuery(top.query);
      setHasMore(true);
      fetchPosts(true, top.tab, top.query);
    }
  }, [fetchPosts]);

  // Android back button handler
  useEffect(() => {
    // Only register on mobile (when Capacitor is available)
    if (!window.Capacitor) return;

    const { App: CapacitorApp } = window.Capacitor.Plugins;

    const handleBackButton = async () => {
      // If settings are open, close them (not part of the browse/detail stack)
      if (settingsOpen) {
        setSettingsOpen(false);
        return;
      }
      if (shortcutsHelpOpen) {
        setShortcutsHelpOpen(false);
        return;
      }
      goBack();
    };

    CapacitorApp.addListener('backButton', handleBackButton);

    return () => {
      CapacitorApp.removeAllListeners();
    };
  }, [settingsOpen, shortcutsHelpOpen, goBack]);

  // Tab switch (Browse/Favorites) keeps the current query, like the original.
  const handleTabChange = useCallback((newTab: Tab) => {
    navigate(newTab, query);
  }, [navigate, query]);

  // Random post
  const fetchRandomPost = useCallback(async () => {
    setLoading(true);
    try {
      let randomQuery = 'order:random';
      const activeAccount = getActiveAccount(settings);
      if (activeAccount && isSafeProvider(activeAccount.hostUrl)) {
        randomQuery = 'rating:s ' + randomQuery;
      }
      const randomPosts = await api.getPosts(settings, randomQuery, 1, 1);
      if (randomPosts.length > 0) {
        openDetail(randomPosts[0]);
        info(t('app.randomPostSuccess'));
      }
    } catch (err) {
      showError(t('app.randomPostError'));
    } finally {
      setLoading(false);
    }
  }, [settings, info, showError, openDetail]);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: '/',
      action: () => document.getElementById('search-input')?.focus(),
      description: t('shortcuts.focusSearch'),
    },
    {
      key: 'r',
      action: () => fetchPosts(true),
      description: t('shortcuts.refresh'),
    },
    {
      key: 'x',
      action: () => fetchRandomPost(),
      description: t('shortcuts.randomPost'),
    },
    {
      key: 's',
      action: () => setSettingsOpen(true),
      description: t('shortcuts.settings'),
    },
    {
      key: 'Escape',
      action: () => {
        if (selectedPost) goBack();
        else if (settingsOpen) setSettingsOpen(false);
        else if (shortcutsHelpOpen) setShortcutsHelpOpen(false);
      },
      description: t('shortcuts.close'),
    },
    {
      key: 'h',
      action: () => handleTabChange('home'),
      description: t('shortcuts.home'),
    },
    {
      key: 'f',
      action: () => {
        const activeAccount = getActiveAccount(settings);
        if (activeAccount?.username) handleTabChange('favorites');
      },
      description: t('shortcuts.favorites'),
    },
    {
      key: 'v',
      action: toggleViewMode,
      description: t('shortcuts.toggleView'),
    },
    {
      key: '?',
      action: () => setShortcutsHelpOpen(true),
      description: t('shortcuts.help'),
    },
  ], !settingsOpen && !selectedPost);

  // Autocomplete
  useEffect(() => {
    if (debouncedQuery.length < 3 || !showSuggestions || tab !== 'home') {
      setSuggestions([]);
      return;
    }
    const lastTag = debouncedQuery.split(' ').pop() ?? '';
    if (lastTag.length < 3) return;

    api.searchTags(settings, lastTag).then(setSuggestions);
  }, [debouncedQuery, showSuggestions, settings, tab]);

  useIntersectionObserver(
    loaderRef,
    () => {
      if (hasMore && !loading) fetchPosts(false);
    },
    { threshold: 0.5 }
  );

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      addToHistory(query.trim());
    }
    navigate(tab, query);
    setShowSuggestions(false);
    setShowHistory(false);
  };

  const handleHistorySelect = (historyQuery: string) => {
    setShowHistory(false);
    navigate(tab, historyQuery);
  };

  const handleTagClick = (tagName: string) => {
    const terms = query.split(' ');
    terms.pop();
    terms.push(tagName);
    setQuery(terms.join(' ') + ' ');
    setSuggestions([]);
    document.getElementById('search-input')?.focus();
  };

  const handleTagSearch = (tag: string) => {
    navigate('home', tag);
  };

  const columns = useMemo(() => {
    const visible = posts.filter((p) => !isPostBlacklisted(p, settings.blacklistedTags));
    return distributeToColumns(visible, numCols);
  }, [posts, numCols, settings]);

  const goHome = () => {
    navigate('home', '');
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col pb-24 md:pb-0">
      {/* Top app bar */}
      <header className="sticky top-0 z-40 bg-surface-container border-b border-outline-variant/40 pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <button className="flex items-center gap-2 cursor-pointer" onClick={goHome}>
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-on-primary font-bold">
              e6
            </div>
            <h1 className="text-xl font-bold hidden sm:block text-on-surface">{t('app.title')}</h1>
          </button>

          <form onSubmit={handleSearch} className="flex-1 relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <i className="fas fa-search text-on-surface-variant" />
            </div>
            <input
              id="search-input"
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
                setShowHistory(false);
              }}
              onFocus={() => {
                setSearchFocused(true);
                if (!query && history.length > 0) {
                  setShowHistory(true);
                }
              }}
              onBlur={() => {
                setSearchFocused(false);
                // Delay hiding to allow clicks
                setTimeout(() => {
                  setShowHistory(false);
                  setShowSuggestions(false);
                }, 200);
              }}
              placeholder={tab === 'favorites' ? t('app.favoritesPlaceholder') : t('app.searchPlaceholder')}
              className="w-full pl-11 pr-4 py-2.5 bg-surface-container-highest text-on-surface placeholder:text-on-surface-variant border-transparent focus:ring-2 focus:ring-primary rounded-full transition-all outline-none"
            />

            {/* Tag suggestions */}
            {suggestions.length > 0 && showSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container rounded-md shadow-elevation-2 border border-outline-variant/40 overflow-hidden max-h-60 overflow-y-auto z-50">
                {suggestions.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className="w-full px-4 py-2 hover:bg-surface-container-high cursor-pointer flex justify-between items-center"
                    onClick={() => handleTagClick(tag.name)}
                  >
                    <span className="font-medium text-on-surface">{tag.name}</span>
                    <span className="text-xs text-on-surface-variant">{tag.post_count}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Search history */}
            <SearchHistory
              history={history}
              onSelect={handleHistorySelect}
              onRemove={removeFromHistory}
              onClear={clearHistory}
              visible={showHistory && !query && searchFocused}
            />
          </form>

          {/* Quick actions */}
          <QuickActions
            onRandom={fetchRandomPost}
            onRefresh={() => fetchPosts(true)}
            loading={loading}
          />

          <Ripple
            className="rounded-full text-on-surface-variant"
            onClick={() => setSettingsOpen(true)}
          >
            <span className="flex items-center justify-center w-10 h-10" title={`${t('shortcuts.settings')} (S)`}>
              <i className="fas fa-cog text-xl" />
            </span>
          </Ripple>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="hidden md:flex items-center justify-between mb-6">
          <TabBar active={tab} onChange={handleTabChange} settings={settings} />
          <div className="flex items-center gap-4">
            <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
            <Ripple
              className="rounded-full text-on-surface-variant"
              onClick={() => setShortcutsHelpOpen(true)}
            >
              <span className="flex items-center justify-center w-10 h-10" title={`${t('shortcuts.help')} (?)`}>
                <i className="fas fa-keyboard" />
              </span>
            </Ripple>
          </div>
        </div>

        {error && (
          <ErrorBanner
            message={error}
            onRetry={() => fetchPosts(false)}
            onSettings={() => setSettingsOpen(true)}
          />
        )}

        {/* Posts display */}
        {viewMode === 'list' ? (
          /* List view */
          <div className="flex flex-col gap-4">
            {posts.filter((p) => !isPostBlacklisted(p, settings.blacklistedTags)).map((post) => (
              <PostListItem key={post.id} post={post} settings={settings} onClick={openDetail} />
            ))}
          </div>
        ) : viewMode === 'compact' ? (
          /* Compact grid view */
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
            {posts.filter((p) => !isPostBlacklisted(p, settings.blacklistedTags)).map((post) => (
              <CompactCard key={post.id} post={post} settings={settings} onClick={openDetail} />
            ))}
          </div>
        ) : (
          /* Masonry grid view (default) */
          <div className="flex gap-4 items-start">
            {columns.map((col, i) => (
              <div key={i} className="flex-1 flex flex-col gap-4 min-w-0">
                {col.map((post) => (
                  <PostCard key={post.id} post={post} settings={settings} onClick={openDetail} />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && posts.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
            <i className="fas fa-folder-open text-4xl mb-4" />
            <p>{t('app.noPosts')}</p>
            {query && (
              <Ripple
                className="mt-4 rounded-full bg-primary text-on-primary"
                onClick={() => { setQuery(''); fetchPosts(true); }}
              >
                <span className="block px-5 py-2.5 font-medium">{t('app.clearSearch')}</span>
              </Ripple>
            )}
          </div>
        )}

        {/* Loader / End indicator */}
        <div ref={loaderRef} className="py-8 flex justify-center w-full">
          {loading && (
            <div className="flex items-center text-primary font-bold">
              <i className="fas fa-spinner fa-spin mr-2 text-xl" /> {t('app.loadingMore')}
            </div>
          )}
          {!hasMore && posts.length > 0 && !loading && (
            <p className="text-on-surface-variant text-sm">{t('app.endReached')}</p>
          )}
        </div>
      </main>

      {/* Modals */}
      {selectedPost && (
        <PostDetail
          post={selectedPost}
          settings={settings}
          onClose={goBack}
          onSearchTag={handleTagSearch}
        />
      )}

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdate={(patch) => {
          updateSettings(patch);
          if (patch.enableProxy && error) setError(null);
        }}
      />

      {/* Keyboard shortcuts help */}
      <KeyboardShortcutsHelp
        isOpen={shortcutsHelpOpen}
        onClose={() => setShortcutsHelpOpen(false)}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Mobile navigation */}
      <MobileNav active={tab} onTabChange={handleTabChange} onSettings={() => setSettingsOpen(true)} settings={settings} />
    </div>
  );
}

/* ---------- Sub-components ---------- */

function TabBar({ active, onChange, settings }: { active: Tab; onChange: (t: Tab) => void; settings: Settings }) {
  const { t } = useTranslation();
  const activeAccount = getActiveAccount(settings);
  const isLoggedIn = !!(activeAccount?.username && activeAccount?.apiKey);
  return (
    <nav className="flex space-x-4">
      <TabButton active={active === 'home'} icon="fa-home" label={t('tabs.browse')} onClick={() => onChange('home')} />
      {isLoggedIn && (
        <TabButton active={active === 'favorites'} icon="fa-heart" label={t('tabs.favorites')} onClick={() => onChange('favorites')} />
      )}
    </nav>
  );
}

function TabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <Ripple
      className={cn(
        'rounded-full font-bold transition-colors',
        active
          ? 'bg-secondary-container text-on-secondary-container'
          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
      )}
      color={active ? 'on-primary-container' : 'on-surface'}
      onClick={onClick}
    >
      <span className="block px-4 py-2">
        <i className={`fas ${icon} mr-2`} />
        {label}
      </span>
    </Ripple>
  );
}

function ErrorBanner({
  message,
  onRetry,
  onSettings,
}: {
  message: string;
  onRetry: () => void;
  onSettings: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="bg-error-container text-on-error-container px-4 py-3 rounded-md relative mb-6 flex flex-col sm:flex-row justify-between items-center gap-4"
      role="alert"
    >
      <p>
        <strong className="font-bold">{t('error.prefix')} </strong>
        {message}
      </p>
      <div className="flex gap-2">
        <Ripple className="rounded-full bg-error text-on-error" onClick={onRetry}>
          <span className="block px-3 py-1 font-bold text-sm">{t('error.retry')}</span>
        </Ripple>
        <Ripple className="rounded-full bg-surface-container-high text-on-surface" onClick={onSettings}>
          <span className="block px-3 py-1 font-bold text-sm">{t('error.settings')}</span>
        </Ripple>
      </div>
    </div>
  );
}

function MobileNav({
  active,
  onTabChange,
  onSettings,
  settings,
}: {
  active: Tab;
  onTabChange: (t: Tab) => void;
  onSettings: () => void;
  settings: Settings;
}) {
  const { t } = useTranslation();
  const activeAccount = getActiveAccount(settings);
  const isLoggedIn = !!(activeAccount?.username && activeAccount?.apiKey);
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-container-high shadow-elevation-2 flex justify-around items-center pt-2 z-30 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
      <MobileNavItem active={active === 'home'} icon="fa-home" label={t('tabs.browse')} onClick={() => onTabChange('home')} />
      {isLoggedIn && (
        <MobileNavItem active={active === 'favorites'} icon="fa-heart" label={t('tabs.favorites')} onClick={() => onTabChange('favorites')} />
      )}
      <MobileNavItem icon="fa-cog" label={t('tabs.settings')} onClick={onSettings} />
    </nav>
  );
}

function MobileNavItem({
  active,
  icon,
  label,
  onClick,
}: {
  active?: boolean;
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <Ripple
      className="rounded-2xl text-on-surface-variant"
      color={active ? 'on-primary-container' : 'on-surface'}
      onClick={onClick}
    >
      <span className="flex flex-col items-center gap-0.5 px-3 py-1.5">
        <span
          className={cn(
            'flex items-center justify-center w-14 h-8 rounded-full transition-colors',
            active && 'bg-secondary-container'
          )}
        >
          <i className={cn('fas', icon, 'text-lg', active ? 'text-on-secondary-container' : 'text-on-surface-variant')} />
        </span>
        <span className={cn('text-xs', active ? 'text-on-surface font-medium' : 'text-on-surface-variant')}>
          {label}
        </span>
      </span>
    </Ripple>
  );
}

/* Compact card for dense grid view */
function CompactCard({ post, settings, onClick }: { key?: Key; post: Post; settings: Settings; onClick: (post: Post) => void }) {
  const isSafe = post.rating === 's';
  const shouldBlur = settings.safeMode && !isSafe;
  const isVideo = ['webm', 'mp4'].includes(post.file.ext);
  const ratingDot = TAG_STYLES.ratingDot[post.rating] ?? TAG_STYLES.ratingDot.default;

  return (
    <Ripple
      className="aspect-square rounded-sm bg-surface-container-high cursor-pointer group"
      onClick={() => onClick(post)}
    >
      <div className="relative w-full h-full overflow-hidden">
        {post.preview.url ? (
          <img
            src={post.preview.url}
            alt={`Post ${post.id}`}
            loading="lazy"
            className={cn(
              'w-full h-full object-cover transition-transform group-hover:scale-105',
              shouldBlur && 'blur-lg group-hover:blur-0'
            )}
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-on-surface-variant">
            <i className="fas fa-image text-xl" />
          </div>
        )}

        {isVideo && (
          <span className="absolute top-1 right-1 bg-surface-container-highest/90 text-on-surface px-1 py-0.5 rounded-full text-xs">
            <i className="fas fa-play" />
          </span>
        )}

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex justify-between text-white text-xs">
            <span className="flex items-center gap-1">
              <span className={cn('w-2 h-2 rounded-full', ratingDot)} aria-hidden />
              <i className="fas fa-heart" /> {post.fav_count}
            </span>
            <span><i className="fas fa-arrow-up" /> {post.score.total}</span>
          </div>
        </div>
      </div>
    </Ripple>
  );
}