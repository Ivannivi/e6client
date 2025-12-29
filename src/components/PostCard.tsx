import React from 'react';
import { Post, AppSettings } from '../types';
import { RATING_COLORS } from '../constants';

interface PostCardProps {
  post: Post;
  settings: AppSettings;
  onClick: (post: Post) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, settings, onClick }) => {
  const isSafe = post.rating === 's';
  const shouldBlur = settings.safeMode && !isSafe;
  const isVideo = post.file.ext === 'webm' || post.file.ext === 'mp4' || post.file.ext === 'gif';
  
  // NOTE: Blacklist check is now handled in parent (App.tsx) for layout stability.

  const borderColor = RATING_COLORS[post.rating] || 'border-gray-500';
  
  // Calculate aspect ratio to prevent layout shift
  // Use preview dimensions if available, otherwise file dimensions
  const width = post.preview.width || post.file.width;
  const height = post.preview.height || post.file.height;
  const aspectRatio = (width && height) ? `${width} / ${height}` : 'auto';

  return (
    <div 
      className={`w-full rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer border-l-4 ${borderColor} group relative`}
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
                    className={`w-full h-full object-cover transition-all duration-300 ${shouldBlur ? 'blur-xl scale-110 group-hover:blur-0 group-hover:scale-100' : ''}`}
                />
            ) : (
                <div className="flex items-center justify-center w-full h-full text-gray-500 absolute inset-0">
                    <i className="fas fa-image-slash text-2xl"></i>
                </div>
            )}
            
            {isVideo && (
                <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs font-bold z-10">
                    {post.file.ext.toUpperCase()}
                </div>
            )}

            {post.relationships.has_children && (
                 <div className="absolute bottom-2 right-2 bg-green-600/80 text-white px-2 py-1 rounded text-xs font-bold z-10">
                    <i className="fas fa-images"></i>
                 </div>
            )}
        </div>

        <div className="p-3">
            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span className="flex items-center">
                    <i className="fas fa-heart text-red-400 mr-1"></i> {post.fav_count}
                </span>
                <span className="flex items-center">
                    <i className="fas fa-arrow-up text-green-400 mr-1"></i> {post.score.total}
                </span>
            </div>
            <div className="text-xs text-gray-400 truncate">
                {post.tags.artist.length > 0 ? post.tags.artist.join(', ') : 'Unknown Artist'}
            </div>
        </div>
    </div>
  );
};