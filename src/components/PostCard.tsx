import type { Key } from 'react';
import type { Post, Settings } from '../types';
import { TAG_STYLES } from '../config';
import { isVideoFile, cn } from '../utils';

interface Props {
  key?: Key;
  post: Post;
  settings: Settings;
  onClick: (post: Post) => void;
}

export function PostCard({ post, settings, onClick }: Props) {
  const isSafe = post.rating === 's';
  const shouldBlur = settings.safeMode && !isSafe;
  const isVideo = isVideoFile(post.file.ext);
  const borderColor = TAG_STYLES.rating[post.rating] ?? TAG_STYLES.rating.default;

  const width = post.preview.width || post.file.width;
  const height = post.preview.height || post.file.height;
  const aspectRatio = width && height ? `${width} / ${height}` : 'auto';

  const artists = post.tags.artist.length > 0
    ? post.tags.artist.join(', ')
    : 'Unknown Artist';

  return (
    <article
      className={cn(
        'w-full rounded-lg overflow-hidden shadow-md hover:shadow-xl',
        'transition-all duration-200 cursor-pointer group relative',
        'bg-white dark:bg-gray-800 border-l-4',
        borderColor
      )}
      onClick={() => onClick(post)}
    >
      <div
        className="relative overflow-hidden bg-gray-200 dark:bg-gray-700 w-full"
        style={{ aspectRatio }}
      >
        {post.preview.url ? (
          <img
            src={post.preview.url}
            alt={`Post ${post.id}`}
            loading="lazy"
            className={cn(
              'w-full h-full object-cover transition-all duration-300',
              shouldBlur && 'blur-xl scale-110 group-hover:blur-0 group-hover:scale-100'
            )}
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-gray-500 absolute inset-0">
            <i className="fas fa-image-slash text-2xl" />
          </div>
        )}

        {isVideo && (
          <span className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs font-bold z-10">
            {post.file.ext.toUpperCase()}
          </span>
        )}

        {post.relationships.has_children && (
          <span className="absolute bottom-2 right-2 bg-green-600/80 text-white px-2 py-1 rounded text-xs font-bold z-10">
            <i className="fas fa-images" />
          </span>
        )}
      </div>

      <footer className="p-3">
        <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span className="flex items-center">
            <i className="fas fa-heart text-red-400 mr-1" /> {post.fav_count}
          </span>
          <span className="flex items-center">
            <i className="fas fa-arrow-up text-green-400 mr-1" /> {post.score.total}
          </span>
        </div>
        <p className="text-xs text-gray-400 truncate">{artists}</p>
      </footer>
    </article>
  );
}