import type { Key } from 'react';
import { useTranslation } from 'react-i18next';
import type { Post, Settings } from '../../types';
import { TAG_STYLES } from '../../config';
import { isVideoFile, formatFileSize, cn } from '../../utils';
import { Ripple } from '../ui/Ripple';

interface Props {
  key?: Key;
  post: Post;
  settings: Settings;
  onClick: (post: Post) => void;
}

export function PostListItem({ post, settings, onClick }: Props) {
  const { t } = useTranslation();
  const isVideo = isVideoFile(post.file.ext);
  const ratingDot = TAG_STYLES.ratingDot[post.rating] ?? TAG_STYLES.ratingDot.default;

  const topTags = [
    ...post.tags.character.slice(0, 2),
    ...post.tags.species.slice(0, 2),
  ].slice(0, 3);

  return (
    <Ripple
      className="w-full rounded-md bg-surface-container-low shadow-elevation-1 hover:shadow-elevation-2 transition-shadow duration-200 cursor-pointer"
      onClick={() => onClick(post)}
    >
      <article className="flex">
        {/* Thumbnail */}
        <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 rounded-l-md overflow-hidden bg-surface-container-high">
          {post.preview.url ? (
            <img
              src={post.preview.url}
              alt={`Post ${post.id}`}
              loading="lazy"
              className={cn('w-full h-full object-cover')}
            />
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full text-on-surface-variant gap-1 px-1">
              <i className="fas fa-hourglass-half text-xl" />
              <span className="text-[10px] text-center leading-tight">
                {t('postDetail.mediaPending')}
              </span>
            </div>
          )}

          {isVideo && (
            <span className="absolute top-1 right-1 bg-surface-container-highest/90 text-on-surface px-1.5 py-0.5 rounded-full text-xs font-bold">
              {post.file.ext.toUpperCase()}
            </span>
          )}

          <div className="absolute bottom-1 left-1 flex items-center gap-1 z-10">
            <span className={cn('flex items-center px-1 py-0.5 rounded-full text-[10px] font-bold text-white', ratingDot)}>
              {post.rating.toUpperCase()}
            </span>
            <span className="flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-bold">
              <i className="fas fa-heart" /> {post.fav_count}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold text-on-surface">
                #{post.id}
              </span>
              <span className="text-xs text-on-surface-variant">
                {post.file.width}x{post.file.height}
              </span>
            </div>
            {topTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {topTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-secondary-container text-on-secondary-container px-1.5 py-0.5 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-on-surface-variant mt-2">
            <span className="flex items-center gap-1">
              <i className="fas fa-arrow-up text-primary" />
              {post.score.total}
            </span>
            <span className="flex items-center gap-1">
              <i className="fas fa-comment text-secondary" />
              {post.comment_count}
            </span>
            <span className="text-on-surface-variant/70 ml-auto">
              {formatFileSize(post.file.size)}
            </span>
          </div>
        </div>
      </article>
    </Ripple>
  );
}
