import { useEffect, useState, useCallback, Key } from 'react';
import type { Post, Settings, Comment } from '../types';
import { api } from '../services/api';
import { RATING, TAG_STYLES } from '../config';
import { formatFileSize, cn, downloadFile, shareContent, generatePostFilename, copyToClipboard } from '../utils';

interface Props {
  post: Post;
  settings: Settings;
  onClose: () => void;
  onSearchTag?: (tag: string) => void;
}

type TagCategory = keyof typeof TAG_STYLES.category;

export function PostDetail({ post, settings, onClose, onSearchTag }: Props) {
  const isVideo = ['webm', 'mp4'].includes(post.file.ext);

  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [uploaderName, setUploaderName] = useState('Unknown');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showCopied, setShowCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingComments(true);
      try {
        const rawComments = await api.getComments(settings, post.id);
        if (cancelled) return;

        const creatorIds = [...new Set(rawComments.map((c) => c.creator_id))];
        const users = await api.getUsersByIds(settings, creatorIds);
        const userMap = new Map(users.map((u) => [u.id, u]));

        const enriched = rawComments.map((c) => ({
          ...c,
          creator: c.creator || userMap.get(c.creator_id)?.name || `User #${c.creator_id}`,
        }));

        if (!cancelled) setComments(enriched);
      } catch {
        if (!cancelled) setComments([]);
      } finally {
        if (!cancelled) setLoadingComments(false);
      }
    }

    load();

    api.getUser(settings, post.uploader_id).then((user) => {
      if (user && !cancelled) setUploaderName(user.name);
    });

    return () => { cancelled = true; };
  }, [post.id, post.uploader_id, settings]);

  const toggleCategory = useCallback((cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }, []);

  const searchTag = useCallback((tag: string) => {
    onClose();
    onSearchTag?.(tag);
  }, [onClose, onSearchTag]);

  const handleDownload = useCallback(async () => {
    if (!post.file.url || downloading) return;
    
    setDownloading(true);
    setDownloadProgress(0);
    
    try {
      const filename = generatePostFilename(post);
      await downloadFile(post.file.url, filename, setDownloadProgress);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  }, [post, downloading]);

  const handleShare = useCallback(async () => {
    const url = `https://e621.net/posts/${post.id}`;
    const shared = await shareContent({
      title: `Post #${post.id}`,
      text: `Check out this post by ${post.tags.artist.join(', ') || 'unknown artist'}`,
      url,
    });
    
    if (shared) {
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  }, [post]);

  const handleCopyLink = useCallback(async () => {
    const url = `https://e621.net/posts/${post.id}`;
    const success = await copyToClipboard(url);
    if (success) {
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  }, [post.id]);

  const renderTags = (tags: string[], category: TagCategory) => {
    if (!tags || tags.length === 0) return null;

    const threshold = 20;
    const isExpanded = expandedCategories[category];
    const shouldCollapse = tags.length > threshold;
    const visible = shouldCollapse && !isExpanded ? tags.slice(0, threshold) : tags;

    return (
      <div className="mb-2">
        <h4 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">
          {category}
        </h4>
        <div className="flex flex-wrap gap-1">
          {visible.map((tag) => (
            <span
              key={tag}
              onClick={() => searchTag(tag)}
              className={cn('text-sm mr-2 hover:underline cursor-pointer', TAG_STYLES.category[category])}
            >
              {tag}
            </span>
          ))}
          {shouldCollapse && (
            <button
              onClick={() => toggleCategory(category)}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-bold ml-1 border rounded px-1"
            >
              {isExpanded ? (
                <>
                  <i className="fas fa-minus mr-1" />
                  Show Less
                </>
              ) : (
                <>
                  <i className="fas fa-plus mr-1" />
                  {tags.length - threshold} more
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  const ratingBadge = {
    s: 'bg-green-100 text-green-800',
    q: 'bg-yellow-100 text-yellow-800',
    e: 'bg-red-100 text-red-800',
  }[post.rating] ?? 'bg-gray-100 text-gray-800';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in pt-safe"
      onClick={onClose}
    >
      <div
        className="w-full h-full md:w-[95vw] md:h-[90vh] bg-white dark:bg-gray-900 md:rounded-lg overflow-hidden flex flex-col md:flex-row shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile close button - Positioned above status bar using safe area */}
        <button
          onClick={onClose}
          className="md:hidden absolute top-safe right-4 z-50 bg-black/50 text-white rounded-full p-2 w-10 h-10 flex items-center justify-center"
        >
          <i className="fas fa-times" />
        </button>

        {/* Media viewer */}
        <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden group">
          {isVideo ? (
            <video
              src={post.file.url ?? ''}
              controls
              autoPlay
              loop
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <img
              src={post.file.url || post.sample.url || post.preview.url || ''}
              alt={`Post ${post.id}`}
              className="max-w-full max-h-full object-contain"
            />
          )}

          <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity">
            {post.file.width}x{post.file.height} • {post.file.ext.toUpperCase()} • {formatFileSize(post.file.size)}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="w-full md:w-[400px] h-[40vh] md:h-full bg-white dark:bg-gray-800 border-l dark:border-gray-700 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="p-4 border-b dark:border-gray-700 flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold dark:text-white">Post #{post.id}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn('text-xs font-bold px-2 py-0.5 rounded', ratingBadge)}>
                  {RATING.labels[post.rating]}
                </span>
                <span className="text-xs text-gray-500">
                  by{' '}
                  <button
                    className="font-bold text-e6-light cursor-pointer hover:underline"
                    onClick={() => searchTag(`user:${uploaderName}`)}
                  >
                    {uploaderName}
                  </button>
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="hidden md:block text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <i className="fas fa-times text-xl" />
            </button>
          </header>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-4">
              {/* Actions */}
              <div className="flex justify-around mb-6 pb-4 border-b dark:border-gray-700">
                <ActionButton icon="fa-arrow-up" label={String(post.score.up)} hoverColor="text-green-500" />
                <ActionButton
                  icon={post.is_favorited ? 'fas fa-heart' : 'far fa-heart'}
                  label={String(post.fav_count)}
                  active={post.is_favorited}
                  hoverColor="text-red-500"
                />
                <button
                  onClick={handleDownload}
                  disabled={downloading || !post.file.url}
                  className={cn(
                    'flex flex-col items-center transition-colors relative',
                    downloading ? 'text-blue-500' : 'text-gray-500 hover:text-blue-500',
                    !post.file.url && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <i className={cn('fas text-xl mb-1', downloading ? 'fa-spinner fa-spin' : 'fa-download')} />
                  <span className="text-xs">
                    {downloading ? `${downloadProgress}%` : 'Save'}
                  </span>
                </button>
                <button
                  onClick={handleShare}
                  className="flex flex-col items-center text-gray-500 hover:text-purple-500 transition-colors relative"
                >
                  <i className="fas fa-share-alt text-xl mb-1" />
                  <span className="text-xs">{showCopied ? 'Copied!' : 'Share'}</span>
                </button>
                <button
                  onClick={handleCopyLink}
                  className="flex flex-col items-center text-gray-500 hover:text-green-500 transition-colors"
                >
                  <i className="fas fa-link text-xl mb-1" />
                  <span className="text-xs">Copy</span>
                </button>
                <a
                  href={`https://e621.net/posts/${post.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center text-gray-500 hover:text-e6-light transition-colors"
                >
                  <i className="fas fa-external-link-alt text-xl mb-1" />
                  <span className="text-xs">Open</span>
                </a>
              </div>

              {/* Tags */}
              <div className="space-y-4">
                {renderTags(post.tags.artist, 'artist')}
                {renderTags(post.tags.character, 'character')}
                {renderTags(post.tags.species, 'species')}
                {renderTags(post.tags.general, 'general')}
                {renderTags(post.tags.meta, 'meta')}
              </div>

              {/* Description */}
              {post.description && (
                <div className="mt-6 pt-4 border-t dark:border-gray-700">
                  <h4 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">
                    Description
                  </h4>
                  <p className="prose dark:prose-invert text-sm max-w-none whitespace-pre-wrap font-sans text-gray-700 dark:text-gray-300 break-words">
                    {post.description}
                  </p>
                </div>
              )}
            </div>

            {/* Comments */}
            <section className="bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700 p-4">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center">
                <i className="fas fa-comments mr-2" /> Comments ({comments.length})
              </h3>

              {loadingComments ? (
                <p className="text-center text-gray-500 py-4">Loading comments...</p>
              ) : comments.length === 0 ? (
                <p className="text-center text-gray-400 py-4 text-sm">No comments yet.</p>
              ) : (
                <div className="space-y-4">
                  {comments.map(
                    (comment) =>
                      !comment.is_hidden && (
                        <CommentItem
                          key={comment.id}
                          comment={comment}
                          onUserClick={() => searchTag(`user:${comment.creator}`)}
                        />
                      )
                  )}
                </div>
              )}
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  active,
  hoverColor,
}: {
  icon: string;
  label: string;
  active?: boolean;
  hoverColor: string;
}) {
  return (
    <button
      className={cn(
        'flex flex-col items-center transition-colors',
        active ? hoverColor : `text-gray-500 hover:${hoverColor}`
      )}
    >
      <i className={cn(icon.includes(' ') ? icon : `fas ${icon}`, 'text-xl mb-1')} />
      <span className="text-xs">{label}</span>
    </button>
  );
}

function CommentItem({
  comment,
  onUserClick,
}: {
  key?: Key;
  comment: Comment;
  onUserClick: () => void;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0">
        <img
          src={`https://static1.e621.net/data/avatars/${comment.creator_id}.jpg`}
          alt={comment.creator}
          className="w-8 h-8 rounded bg-gray-300 object-cover"
          onError={(e) => {
            e.currentTarget.src = 'https://e621.net/images/guest.png';
            e.currentTarget.onerror = null;
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <button
            className="text-xs font-bold text-e6-light cursor-pointer hover:underline"
            onClick={onUserClick}
          >
            {comment.creator}
          </button>
          <span className="text-[10px] text-gray-400">
            {new Date(comment.created_at).toLocaleDateString()}
          </span>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
          {comment.body}
        </p>
        <div className="mt-1 flex items-center text-xs text-gray-500">
          <i className="fas fa-arrow-up text-green-500 mr-1" /> {comment.score}
        </div>
      </div>
    </div>
  );
}