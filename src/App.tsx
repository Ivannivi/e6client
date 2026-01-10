import { useState, useEffect, useCallback, useRef, useMemo, FormEvent, Key } from 'react';
import type { Post, Settings, TagSuggestion } from './types';
import { getActiveAccount } from './types';
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

type Tab = 'home' | 'favorites';

export default function App() {
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
  const navigationHistory = useRef<Tab[]>([]);
  const debouncedQuery = useDebounce(query, 300);
  const numCols = useColumnCount();

  // Android back button handler
  useEffect(() => {
    // Only register on mobile (when Capacitor is available)
    if (!window.Capacitor) return;

    const { App: CapacitorApp } = window.Capacitor.Plugins;
    
    const handleBackButton = async () => {
      // If detail view is open, close it
      if (selectedPost) {
        setSelectedPost(null);
        return;
      }
      // If settings are open, close them
      if (settingsOpen) {
        setSettingsOpen(false);
        return;
      }
      // If there's navigation history, go back
      if (navigationHistory.current.length > 0) {
        const previousTab = navigationHistory.current.pop()!;
        setTab(previousTab);
        return;
      }
      // Otherwise, exit the app
      CapacitorApp.exitApp();
    };

    CapacitorApp.addListener('backButton', handleBackButton);
    
    return () => {
      CapacitorApp.removeAllListeners();
    };
  }, [selectedPost, settingsOpen]);

  // Track tab changes for back navigation
  const handleTabChange = useCallback((newTab: Tab) => {
    if (newTab !== tab) {
      navigationHistory.current.push(tab);
      setTab(newTab);
    }
  }, [tab]);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: '/',
      action: () => document.getElementById('search-input')?.focus(),
      description: 'Focus search',
    },
    {
      key: 'r',
      action: () => fetchPosts(true),
      description: 'Refresh',
    },
    {
      key: 'x',
      action: () => fetchRandomPost(),
      description: 'Random post',
    },
    {
      key: 's',
      action: () => setSettingsOpen(true),
      description: 'Settings',
    },
    {
      key: 'Escape',
      action: () => {
        if (selectedPost) setSelectedPost(null);
        else if (settingsOpen) setSettingsOpen(false);
        else if (shortcutsHelpOpen) setShortcutsHelpOpen(false);
      },
      description: 'Close',
    },
    {
      key: 'h',
      action: () => handleTabChange('home'),
      description: 'Home',
    },
    {
      key: 'f',
      action: () => {
        const activeAccount = getActiveAccount(settings);
        if (activeAccount?.username) handleTabChange('favorites');
      },
      description: 'Favorites',
    },
    {
      key: 'v',
      action: toggleViewMode,
      description: 'Toggle view',
    },
    {
      key: '?',
      action: () => setShortcutsHelpOpen(true),
      description: 'Help',
    },
  ], !settingsOpen && !selectedPost);

  // Random post
  const fetchRandomPost = useCallback(async () => {
    setLoading(true);
    try {
      let randomQuery = 'order:random';
      if (!settings.nsfwEnabled) {
        randomQuery = 'rating:s ' + randomQuery;
      }
      const randomPosts = await api.getPosts(settings, randomQuery, 1, 1);
      if (randomPosts.length > 0) {
        setSelectedPost(randomPosts[0]);
        info('Loaded a random post!');
      }
    } catch (err) {
      showError('Failed to load random post');
    } finally {
      setLoading(false);
    }
  }, [settings, info, showError]);

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

  const fetchPosts = useCallback(
    async (reset = false) => {
      if (loading || (!reset && !hasMore)) return;

      setLoading(true);
      if (reset) setError(null);

      try {
        let finalQuery = query;

        if (tab === 'favorites') {
          const activeAccount = getActiveAccount(settings);
          if (!activeAccount?.username) {
            throw new Error('Please set your username in Settings > Account to view favorites.');
          }
          finalQuery = `fav:${activeAccount.username} ${query}`;
        }

        if (!settings.nsfwEnabled) {
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
    fetchPosts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

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
    setHasMore(true);
    fetchPosts(true);
    setShowSuggestions(false);
    setShowHistory(false);
  };

  const handleHistorySelect = (historyQuery: string) => {
    setQuery(historyQuery);
    setShowHistory(false);
    setHasMore(true);
    setTimeout(() => fetchPosts(true), 0);
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
    setQuery(tag);
    handleTabChange('home');
    setHasMore(true);
    setTimeout(() => fetchPosts(true), 0);
  };

  const columns = useMemo(() => {
    const visible = posts.filter((p) => !isPostBlacklisted(p, settings.blacklistedTags));
    return distributeToColumns(visible, numCols);
  }, [posts, numCols, settings]);

  const goHome = () => {
    setQuery('');
    handleTabChange('home');
    fetchPosts(true);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col pb-16 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 shadow-md pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <button className="flex items-center gap-2 cursor-pointer" onClick={goHome}>
            <div className="w-8 h-8 bg-e6-base rounded-md flex items-center justify-center text-white font-bold">
              e6
            </div>
            <h1 className="text-xl font-bold hidden sm:block text-e6-base dark:text-e6-light">Client</h1>
          </button>

          <form onSubmit={handleSearch} className="flex-1 relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="fas fa-search text-gray-400" />
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
              placeholder={tab === 'favorites' ? 'Filter favorites...' : 'Search tags... (e.g. rating:s fox)'}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-transparent focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-e6-light rounded-lg transition-all outline-none"
            />

            {/* Tag suggestions */}
            {suggestions.length > 0 && showSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700 overflow-hidden max-h-60 overflow-y-auto z-50">
                {suggestions.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className="w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex justify-between items-center"
                    onClick={() => handleTagClick(tag.name)}
                  >
                    <span className="font-medium">{tag.name}</span>
                    <span className="text-xs text-gray-500">{tag.post_count}</span>
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

          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            title="Settings (S)"
          >
            <i className="fas fa-cog text-xl" />
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <TabBar active={tab} onChange={(t) => { handleTabChange(t); setPage(1); }} settings={settings} />
          <div className="hidden md:flex items-center gap-4">
            <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
            <button
              onClick={() => setShortcutsHelpOpen(true)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              title="Keyboard shortcuts (?)"
            >
              <i className="fas fa-keyboard" />
            </button>
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
              <PostListItem key={post.id} post={post} settings={settings} onClick={setSelectedPost} />
            ))}
          </div>
        ) : viewMode === 'compact' ? (
          /* Compact grid view */
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
            {posts.filter((p) => !isPostBlacklisted(p, settings.blacklistedTags)).map((post) => (
              <CompactCard key={post.id} post={post} settings={settings} onClick={setSelectedPost} />
            ))}
          </div>
        ) : (
          /* Masonry grid view (default) */
          <div className="flex gap-4 items-start">
            {columns.map((col, i) => (
              <div key={i} className="flex-1 flex flex-col gap-4 min-w-0">
                {col.map((post) => (
                  <PostCard key={post.id} post={post} settings={settings} onClick={setSelectedPost} />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && posts.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <i className="fas fa-folder-open text-4xl mb-4" />
            <p>No posts found.</p>
            {query && (
              <button
                onClick={() => { setQuery(''); fetchPosts(true); }}
                className="mt-4 px-4 py-2 bg-e6-light text-white rounded-lg hover:bg-e6-base transition-colors"
              >
                Clear Search
              </button>
            )}
          </div>
        )}

        {/* Loader / End indicator */}
        <div ref={loaderRef} className="py-8 flex justify-center w-full">
          {loading && (
            <div className="flex items-center text-e6-light font-bold">
              <i className="fas fa-spinner fa-spin mr-2 text-xl" /> Loading more...
            </div>
          )}
          {!hasMore && posts.length > 0 && !loading && (
            <p className="text-gray-500 text-sm">You've reached the end!</p>
          )}
        </div>
      </main>

      {/* Modals */}
      {selectedPost && (
        <PostDetail
          post={selectedPost}
          settings={settings}
          onClose={() => setSelectedPost(null)}
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
      <MobileNav active={tab} onTabChange={setTab} onSettings={() => setSettingsOpen(true)} settings={settings} />
    </div>
  );
}

/* ---------- Sub-components ---------- */

function TabBar({ active, onChange, settings }: { active: Tab; onChange: (t: Tab) => void; settings: Settings }) {
  const activeAccount = getActiveAccount(settings);
  const isLoggedIn = !!(activeAccount?.username && activeAccount?.apiKey);
  return (
    <nav className="flex space-x-4">
      <TabButton active={active === 'home'} icon="fa-home" label="Browse" onClick={() => onChange('home')} />
      {isLoggedIn && (
        <TabButton active={active === 'favorites'} icon="fa-heart" label="Favorites" onClick={() => onChange('favorites')} />
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
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 rounded-lg font-bold transition-colors',
        active
          ? 'bg-e6-light text-white'
          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
      )}
    >
      <i className={`fas ${icon} mr-2`} />
      {label}
    </button>
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
  return (
    <div
      className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6 flex flex-col sm:flex-row justify-between items-center gap-4"
      role="alert"
    >
      <p>
        <strong className="font-bold">Error: </strong>
        {message}
      </p>
      <div className="flex gap-2">
        <button
          onClick={onRetry}
          className="px-3 py-1 bg-red-200 hover:bg-red-300 rounded text-red-800 font-bold text-sm"
        >
          Retry
        </button>
        <button
          onClick={onSettings}
          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-800 font-bold text-sm"
        >
          Settings
        </button>
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
  const activeAccount = getActiveAccount(settings);
  const isLoggedIn = !!(activeAccount?.username && activeAccount?.apiKey);
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 flex justify-around py-2 z-30 pb-[env(safe-area-inset-bottom)]">
      <MobileNavItem active={active === 'home'} icon="fa-home" label="Browse" onClick={() => onTabChange('home')} />
      {isLoggedIn && (
        <MobileNavItem active={active === 'favorites'} icon="fa-heart" label="Favorites" onClick={() => onTabChange('favorites')} />
      )}
      <MobileNavItem icon="fa-cog" label="Settings" onClick={onSettings} />
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
    <button
      onClick={onClick}
      className={cn('flex flex-col items-center p-2', active ? 'text-e6-light' : 'text-gray-500')}
    >
      <i className={`fas ${icon} text-xl mb-1`} />
      <span className="text-xs">{label}</span>
    </button>
  );
}

/* Compact card for dense grid view */
function CompactCard({ post, settings, onClick }: { key?: Key; post: Post; settings: Settings; onClick: (post: Post) => void }) {
  const isSafe = post.rating === 's';
  const shouldBlur = settings.safeMode && !isSafe;
  const isVideo = ['webm', 'mp4'].includes(post.file.ext);
  const borderColor = {
    s: 'border-green-500',
    q: 'border-yellow-500',
    e: 'border-red-500',
  }[post.rating] ?? 'border-gray-500';

  return (
    <div
      className={cn(
        'aspect-square relative overflow-hidden rounded-md cursor-pointer',
        'bg-gray-200 dark:bg-gray-700 border-2 group',
        borderColor
      )}
      onClick={() => onClick(post)}
    >
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
        <div className="flex items-center justify-center w-full h-full text-gray-500">
          <i className="fas fa-image text-xl" />
        </div>
      )}
      
      {isVideo && (
        <span className="absolute top-1 left-1 bg-black/60 text-white px-1 py-0.5 rounded text-xs">
          <i className="fas fa-play" />
        </span>
      )}
      
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex justify-between text-white text-xs">
          <span><i className="fas fa-heart" /> {post.fav_count}</span>
          <span><i className="fas fa-arrow-up" /> {post.score.total}</span>
        </div>
      </div>
    </div>
  );
}