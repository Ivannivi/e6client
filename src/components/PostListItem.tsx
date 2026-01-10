import type { Key } from 'react';
import type { Post, Settings } from '../types';
import { TAG_STYLES } from '../config';
import { isVideoFile, formatFileSize, cn } from '../utils';

interface Props {
  key?: Key;
  post: Post;
  settings: Settings;
  onClick: (post: Post) => void;
}

export function PostListItem({ post, settings, onClick }: Props) {
  const isSafe = post.rating === 's';
  const shouldBlur = settings.safeMode && !isSafe;
  const isVideo = isVideoFile(post.file.ext);
  const borderColor = TAG_STYLES.rating[post.rating] ?? TAG_STYLES.rating.default;

  const artists = post.tags.artist.length > 0
    ? post.tags.artist.join(', ')
    : 'Unknown Artist';

  const topTags = [
    ...post.tags.character.slice(0, 2),
    ...post.tags.species.slice(0, 2),
  ].slice(0, 3);

  return (
    <article
      className={cn(
        'w-full rounded-lg overflow-hidden shadow-md hover:shadow-xl',
        'transition-all duration-200 cursor-pointer',
        'bg-white dark:bg-gray-800 border-l-4 flex',
        borderColor
      )}
      onClick={() => onClick(post)}
    >
      {/* Thumbnail */}
      <div
        className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 bg-gray-200 dark:bg-gray-700"
      >
        {post.preview.url ? (
          <img
            src={post.preview.url}
            alt={`Post ${post.id}`}
            loading="lazy"
            className={cn(
              'w-full h-full object-cover',
              shouldBlur && 'blur-xl'
            )}
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-gray-500">
            <i className="fas fa-image-slash text-xl" />
          </div>
        )}

        {isVideo && (
          <span className="absolute top-1 right-1 bg-black/60 text-white px-1.5 py-0.5 rounded text-xs font-bold">
            {post.file.ext.toUpperCase()}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
              #{post.id}
            </span>
            <span className="text-xs text-gray-500">
              {post.file.width}x{post.file.height}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2">
            by {artists}
          </p>
          {topTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {topTags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-2">
          <span className="flex items-center gap-1">
            <i className="fas fa-heart text-red-400" />
            {post.fav_count}
          </span>
          <span className="flex items-center gap-1">
            <i className="fas fa-arrow-up text-green-400" />
            {post.score.total}
          </span>
          <span className="flex items-center gap-1">
            <i className="fas fa-comment text-blue-400" />
            {post.comment_count}
          </span>
          <span className="text-gray-400 ml-auto">
            {formatFileSize(post.file.size)}
          </span>
        </div>
      </div>
    </article>
  );
}
