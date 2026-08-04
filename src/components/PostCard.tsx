import type { Key } from 'react';
import { useTranslation } from 'react-i18next';
import type { Post, Settings } from '../types';
import { TAG_STYLES } from '../config';
import { isVideoFile, cn } from '../utils';
import { Ripple } from './Ripple';

interface Props {
  key?: Key;
  post: Post;
  settings: Settings;
  onClick: (post: Post) => void;
}

export function PostCard({ post, settings, onClick }: Props) {
  const { t } = useTranslation();
  const isVideo = isVideoFile(post.file.ext);
  const ratingDot = TAG_STYLES.ratingDot[post.rating] ?? TAG_STYLES.ratingDot.default;

  const width = post.preview.width || post.file.width;
  const height = post.preview.height || post.file.height;
  const aspectRatio = width && height ? `${width} / ${height}` : 'auto';

  return (
    <Ripple
      className="w-full rounded-md bg-surface-container-low shadow-elevation-1 hover:shadow-elevation-2 transition-shadow duration-200 cursor-pointer group"
      onClick={() => onClick(post)}
    >
      <article>
        <div
          className="relative overflow-hidden bg-surface-container-high w-full"
          style={{ aspectRatio }}
        >
          {post.preview.url ? (
            <img
              src={post.preview.url}
              alt={`Post ${post.id}`}
              loading="lazy"
              className={cn(
                'w-full h-full object-cover transition-all duration-300',
              )}
            />
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full text-on-surface-variant absolute inset-0 gap-1 px-2">
              <i className="fas fa-hourglass-half text-2xl" />
              <span className="text-[10px] text-center leading-tight">
                {t('postDetail.mediaPending')}
              </span>
            </div>
          )}

          {isVideo && (
            <span className="absolute top-2 right-2 bg-surface-container-highest/90 text-on-surface px-2 py-0.5 rounded-full text-xs font-bold z-10">
              {post.file.ext.toUpperCase()}
            </span>
          )}

          {post.relationships.has_children && (
            <span className="absolute bottom-2 right-2 bg-tertiary-container/95 text-on-tertiary-container px-2 py-0.5 rounded-full text-xs font-bold z-10">
              <i className="fas fa-images" />
            </span>
          )}
        </div>

        <footer className="p-3">
          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
            <span
              className={cn('w-2 h-2 rounded-full flex-shrink-0', ratingDot)}
              aria-hidden
            />
            <span className="flex items-center flex-shrink-0">
              <i className="fas fa-heart text-tertiary mr-1" /> {post.fav_count}
            </span>
            <span className="flex items-center flex-shrink-0">
              <i className="fas fa-arrow-up text-primary mr-1" /> {post.score.total}
            </span>
          </div>
        </footer>
      </article>
    </Ripple>
  );
}
