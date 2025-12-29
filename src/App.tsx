import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import { ApiService } from './services/api';
import { PostCard } from './components/PostCard';
import { PostDetail } from './components/PostDetail';
import { SettingsModal } from './components/SettingsModal';
import { useSettings } from './hooks/useSettings';
import { Post, AppSettings } from './types';

// Simple debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// Hook to determine column count based on window width
function useColumnCount() {
  const [cols, setCols] = useState(2);
  
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w >= 1280) setCols(5); // xl
      else if (w >= 1024) setCols(4); // lg
      else if (w >= 768) setCols(3); // md
      else setCols(2); // sm/default
    };
    
    handleResize(); // Initial
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return cols;
}

// Helper to check blacklist
const isPostBlacklisted = (post: Post, settings: AppSettings) => {
    return post.tags.general.some(t => settings.blacklistedTags.includes(t)) || 
           post.tags.species.some(t => settings.blacklistedTags.includes(t)) ||
           post.tags.character.some(t => settings.blacklistedTags.includes(t)) ||
           post.tags.artist.some(t => settings.blacklistedTags.includes(t));
};

const App: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<'home' | 'favorites'>('home');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // UI State
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Infinite Scroll Ref
  const loaderRef = useRef<HTMLDivElement>(null);
  
  const debouncedSearchTerm = useDebounce(searchQuery, 300);
  const numCols = useColumnCount();

  // Autocomplete
  useEffect(() => {
      if (debouncedSearchTerm.length > 2 && showSuggestions && activeTab === 'home') {
          const lastTag = debouncedSearchTerm.split(' ').pop();
          if (lastTag && lastTag.length > 2) {
            ApiService.getTags(settings, lastTag).then(tags => {
                setSuggestions(tags);
            });
          }
      } else {
          setSuggestions([]);
      }
  }, [debouncedSearchTerm, showSuggestions, settings, activeTab]);

  const fetchPosts = useCallback(async (reset: boolean = false) => {
    if (loading || (!reset && !hasMore)) return;
    
    setLoading(true);
    if(reset) setError(null);
    
    try {
      // Determine query based on active tab
      let finalQuery = searchQuery;
      if (activeTab === 'favorites') {
          if (!settings.username) {
              throw new Error("Please set your username in Settings > Account to view favorites.");
          }
          finalQuery = `fav:${settings.username} ${searchQuery}`;
      }

      const currentPage = reset ? 1 : page;
      const fetchedPosts = await ApiService.getPosts(settings, finalQuery, currentPage);
      
      if (fetchedPosts.length === 0) {
          setHasMore(false);
      } else {
          setHasMore(true);
      }

      if (reset) {
        setPosts(fetchedPosts);
        setPage(2);
      } else {
        // Filter duplicates just in case
        setPosts(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newPosts = fetchedPosts.filter((p: Post) => !existingIds.has(p.id));
            return [...prev, ...newPosts];
        });
        setPage(prev => prev + 1);
      }
    } catch (err: any) {
      console.error(err);
      let msg = 'Unknown error';
      
      if (axios.isAxiosError(err)) {
          if (err.response) {
              msg = `Server Error: ${err.response.status} ${err.response.statusText}`;
              if (err.response.status === 403 || err.response.status === 401) {
                  msg += " (Check API Key/User or Proxy)";
              }
          } else if (err.request) {
              msg = "Network Error: No response received. Possible CORS or connection issue.";
          } else {
              msg = err.message;
          }
      } else if (err instanceof Error) {
          msg = err.message;
      }

      if (reset) setError(msg); // Only show main error on full reload
    } finally {
      setLoading(false);
    }
  }, [settings, searchQuery, page, loading, activeTab, hasMore]);

  // Initial load or Tab Change
  useEffect(() => {
    fetchPosts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]); 

  // Infinite Scroll Observer
  useEffect(() => {
      const observer = new IntersectionObserver(
          (entries) => {
              if (entries[0].isIntersecting && hasMore && !loading) {
                  fetchPosts(false);
              }
          },
          { threshold: 0.5 }
      );

      if (loaderRef.current) {
          observer.observe(loaderRef.current);
      }

      return () => observer.disconnect();
  }, [hasMore, loading, fetchPosts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHasMore(true);
    fetchPosts(true);
    setShowSuggestions(false);
  };

  const handleTagClick = (tagName: string) => {
     const terms = searchQuery.split(' ');
     terms.pop();
     terms.push(tagName);
     const newQuery = terms.join(' ') + ' ';
     setSearchQuery(newQuery);
     setSuggestions([]);
     document.getElementById('search-input')?.focus();
  };
  
  // Tag search from detail view
  const handleTagSearch = (tag: string) => {
      setSearchQuery(tag);
      setActiveTab('home');
      setHasMore(true);
      // Wait for state to update then fetch
      setTimeout(() => fetchPosts(true), 0);
  };

  // Deterministic Masonry Layout Calculation
  // We filter blacklisted posts BEFORE distribution to ensure columns are balanced visually.
  const columnBuckets = useMemo(() => {
    const buckets = Array.from({ length: numCols }, () => [] as Post[]);
    
    // Filter out blacklisted posts first
    const visiblePosts = posts.filter(p => !isPostBlacklisted(p, settings));

    visiblePosts.forEach((post, index) => {
        // Distribute round-robin style
        buckets[index % numCols].push(post);
    });
    
    return buckets;
  }, [posts, numCols, settings]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col pb-16 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 shadow-md pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setSearchQuery(''); setActiveTab('home'); fetchPosts(true); }}>
            <div className="w-8 h-8 bg-e6-base rounded-md flex items-center justify-center text-white font-bold">
              e6
            </div>
            <h1 className="text-xl font-bold hidden sm:block text-e6-base dark:text-e6-light">Client</h1>
          </div>

          <form onSubmit={handleSearch} className="flex-1 relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="fas fa-search text-gray-400"></i>
            </div>
            <input
              id="search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
              placeholder={activeTab === 'favorites' ? "Filter favorites..." : "Search tags... (e.g. rating:s fox)"}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-transparent focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-e6-light rounded-lg transition-all outline-none"
            />
            {/* Autocomplete Dropdown */}
            {suggestions.length > 0 && showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700 overflow-hidden max-h-60 overflow-y-auto">
                    {suggestions.map((tag: any) => (
                        <div 
                            key={tag.id} 
                            className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex justify-between items-center"
                            onClick={() => handleTagClick(tag.name)}
                        >
                            <span className="font-medium">{tag.name}</span>
                            <span className="text-xs text-gray-500">{tag.post_count}</span>
                        </div>
                    ))}
                </div>
            )}
          </form>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <i className="fas fa-cog text-xl"></i>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        
        {/* Tab Header (Desktop/Tablet) */}
        <div className="flex mb-6 space-x-4">
             <button 
                onClick={() => { setActiveTab('home'); setPage(1); }}
                className={`px-4 py-2 rounded-lg font-bold transition-colors ${activeTab === 'home' ? 'bg-e6-light text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
             >
                 <i className="fas fa-home mr-2"></i> Browse
             </button>
             <button 
                onClick={() => { setActiveTab('favorites'); setPage(1); }}
                className={`px-4 py-2 rounded-lg font-bold transition-colors ${activeTab === 'favorites' ? 'bg-e6-light text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
             >
                 <i className="fas fa-heart mr-2"></i> Favorites
             </button>
        </div>

        {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6 flex flex-col sm:flex-row justify-between items-center gap-4" role="alert">
                <div>
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
                <div className="flex gap-2">
                     <button 
                        onClick={() => fetchPosts(false)}
                        className="px-3 py-1 bg-red-200 hover:bg-red-300 rounded text-red-800 font-bold text-sm"
                    >
                        Retry
                    </button>
                    <button 
                        onClick={() => setIsSettingsOpen(true)}
                        className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-800 font-bold text-sm"
                    >
                        Settings
                    </button>
                </div>
            </div>
        )}

        {/* JS Deterministic Masonry Grid */}
        <div className="flex gap-4 items-start">
          {columnBuckets.map((bucket, colIndex) => (
             <div key={colIndex} className="flex-1 flex flex-col gap-4 min-w-0">
                {bucket.map((post) => (
                    <PostCard 
                      key={post.id} 
                      post={post} 
                      settings={settings}
                      onClick={setSelectedPost} 
                    />
                ))}
             </div>
          ))}
        </div>
        
        {/* Empty State */}
        {!loading && posts.length === 0 && !error && (
             <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                 <i className="fas fa-folder-open text-4xl mb-4"></i>
                 <p>No posts found.</p>
             </div>
        )}

        {/* Infinite Scroll Loader */}
        <div ref={loaderRef} className="py-8 flex justify-center w-full">
            {loading && (
                <div className="flex items-center text-e6-light font-bold">
                    <i className="fas fa-spinner fa-spin mr-2 text-xl"></i> Loading more...
                </div>
            )}
            {!hasMore && posts.length > 0 && !loading && (
                 <div className="text-gray-500 text-sm">You've reached the end!</div>
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
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings}
        onUpdate={(newSettings) => {
            updateSettings(newSettings);
            if (newSettings.enableProxy && error) {
                setError(null);
            }
        }}
      />
      
      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 flex justify-around py-2 z-30 pb-[env(safe-area-inset-bottom)]">
        <button 
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center p-2 ${activeTab === 'home' ? 'text-e6-light' : 'text-gray-500'}`}
        >
            <i className="fas fa-home text-xl mb-1"></i>
            <span className="text-xs">Browse</span>
        </button>
        <button 
            onClick={() => setActiveTab('favorites')}
            className={`flex flex-col items-center p-2 ${activeTab === 'favorites' ? 'text-e6-light' : 'text-gray-500'}`}
        >
            <i className="fas fa-heart text-xl mb-1"></i>
            <span className="text-xs">Favorites</span>
        </button>
        <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex flex-col items-center p-2 text-gray-500"
        >
            <i className="fas fa-cog text-xl mb-1"></i>
            <span className="text-xs">Settings</span>
        </button>
      </div>

    </div>
  );
};

export default App;