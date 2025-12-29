import React, { useEffect, useState } from 'react';
import { Post, AppSettings, Comment, User } from '../types';
import { ApiService } from '../services/api';
import { RATING_TEXT, TAG_CATEGORY_COLORS } from '../constants';

interface PostDetailProps {
  post: Post;
  settings: AppSettings;
  onClose: () => void;
  onSearchTag?: (tag: string) => void;
}

export const PostDetail: React.FC<PostDetailProps> = ({ post, settings, onClose, onSearchTag }) => {
  const isVideo = ['webm', 'mp4'].includes(post.file.ext);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [uploaderName, setUploaderName] = useState<string>('Unknown');
  
  // Tag collapsing state
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLoadingComments(true);
    // Fetch comments and then enrich with user data
    const fetchCommentsAndUsers = async () => {
        try {
            const rawComments = await ApiService.getComments(settings, post.id);
            
            // Extract Creator IDs to fetch names/avatars if missing
            const creatorIds = [...new Set(rawComments.map(c => c.creator_id))];
            
            // Batch fetch users
            const users = await ApiService.getUsersByIds(settings, creatorIds);
            const userMap = new Map(users.map(u => [u.id, u]));

            // Enrich comments
            const enrichedComments = rawComments.map(c => ({
                ...c,
                creator: c.creator || userMap.get(c.creator_id)?.name || `User #${c.creator_id}`
            }));

            setComments(enrichedComments);
        } catch (error) {
            console.error(error);
            setComments([]);
        } finally {
            setLoadingComments(false);
        }
    };

    fetchCommentsAndUsers();

    // Fetch Uploader
    ApiService.getUserById(settings, post.uploader_id)
       .then(user => {
           if (user) setUploaderName(user.name);
       })
       .catch(err => console.error("Failed to load uploader", err));

  }, [post.id, post.uploader_id, settings]);
  
  const toggleCategory = (category: string) => {
      setExpandedCategories(prev => ({...prev, [category]: !prev[category]}));
  };

  const renderTags = (tags: string[], category: keyof typeof TAG_CATEGORY_COLORS) => {
    if (!tags || tags.length === 0) return null;
    
    const isExpanded = expandedCategories[category];
    const threshold = 20; // Number of tags before collapsing
    const shouldCollapse = tags.length > threshold;
    const displayedTags = (shouldCollapse && !isExpanded) ? tags.slice(0, threshold) : tags;

    return (
      <div className="mb-2">
        <h4 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">{category}</h4>
        <div className="flex flex-wrap gap-1">
          {displayedTags.map(tag => (
            <span 
                key={tag} 
                onClick={() => {
                    onClose();
                    if(onSearchTag) onSearchTag(tag);
                }}
                className={`text-sm mr-2 ${TAG_CATEGORY_COLORS[category]} hover:underline cursor-pointer`}
            >
              {tag}
            </span>
          ))}
          {shouldCollapse && (
              <button 
                onClick={() => toggleCategory(category)}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-bold ml-1 border rounded px-1"
              >
                  {isExpanded ? <><i className="fas fa-minus mr-1"></i>Show Less</> : <><i className="fas fa-plus mr-1"></i>{tags.length - threshold} more</>}
              </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div className="w-full h-full md:w-[95vw] md:h-[90vh] bg-white dark:bg-gray-900 md:rounded-lg overflow-hidden flex flex-col md:flex-row shadow-2xl relative" onClick={e => e.stopPropagation()}>
        
        {/* Close Button Mobile */}
        <button 
            onClick={onClose} 
            className="md:hidden absolute top-4 right-4 z-50 bg-black/50 text-white rounded-full p-2 w-10 h-10 flex items-center justify-center"
        >
            <i className="fas fa-times"></i>
        </button>

        {/* Media Viewer */}
        <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden group">
          {isVideo ? (
            <video 
                src={post.file.url || ''} 
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
            {post.file.width}x{post.file.height} • {post.file.ext.toUpperCase()} • {(post.file.size / 1024 / 1024).toFixed(2)} MB
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="w-full md:w-[400px] h-[40vh] md:h-full bg-white dark:bg-gray-800 border-l dark:border-gray-700 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-start">
                <div>
                    <h2 className="text-lg font-bold dark:text-white">Post #{post.id}</h2>
                    <div className="flex items-center gap-2 mt-1">
                         <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            post.rating === 's' ? 'bg-green-100 text-green-800' :
                            post.rating === 'q' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                        }`}>
                            {RATING_TEXT[post.rating]}
                        </span>
                        <span className="text-xs text-gray-500">
                            by <span 
                                className="font-bold text-e6-light cursor-pointer hover:underline"
                                onClick={() => {
                                    onClose();
                                    if(onSearchTag) onSearchTag(`user:${uploaderName}`);
                                }}
                            >{uploaderName}</span>
                        </span>
                    </div>
                </div>
                <button onClick={onClose} className="hidden md:block text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <i className="fas fa-times text-xl"></i>
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                
                <div className="p-4">
                    {/* Actions */}
                    <div className="flex justify-around mb-6 pb-4 border-b dark:border-gray-700">
                        <button className="flex flex-col items-center text-gray-500 hover:text-green-500 transition-colors">
                            <i className="fas fa-arrow-up text-xl mb-1"></i>
                            <span className="text-xs">{post.score.up}</span>
                        </button>
                        <button className={`flex flex-col items-center transition-colors ${post.is_favorited ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}>
                            <i className={`${post.is_favorited ? 'fas' : 'far'} fa-heart text-xl mb-1`}></i>
                            <span className="text-xs">{post.fav_count}</span>
                        </button>
                        <button className="flex flex-col items-center text-gray-500 hover:text-blue-500 transition-colors">
                            <i className="fas fa-download text-xl mb-1"></i>
                            <span className="text-xs">Save</span>
                        </button>
                        <a 
                            href={`https://e621.net/posts/${post.id}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex flex-col items-center text-gray-500 hover:text-e6-light transition-colors"
                        >
                            <i className="fas fa-external-link-alt text-xl mb-1"></i>
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
                            <h4 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">Description</h4>
                            <div className="prose dark:prose-invert text-sm max-w-none whitespace-pre-wrap font-sans text-gray-700 dark:text-gray-300 break-words">
                                {post.description}
                            </div>
                        </div>
                    )}
                </div>

                {/* Comments Section */}
                <div className="bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700 p-4">
                     <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center">
                        <i className="fas fa-comments mr-2"></i> Comments ({comments.length})
                     </h3>
                     
                     {loadingComments ? (
                         <div className="text-center text-gray-500 py-4">Loading comments...</div>
                     ) : comments.length === 0 ? (
                         <div className="text-center text-gray-400 py-4 text-sm">No comments yet.</div>
                     ) : (
                         <div className="space-y-4">
                             {comments.map(comment => (
                                 !comment.is_hidden && (
                                     <div key={comment.id} className="flex gap-3">
                                         {/* Avatar */}
                                         <div className="flex-shrink-0">
                                             <img 
                                                src={`https://static1.e621.net/data/avatars/${comment.creator_id}.jpg`}
                                                alt={comment.creator}
                                                className="w-8 h-8 rounded bg-gray-300 object-cover"
                                                onError={(e) => {
                                                    // Fallback to default avatar if 404
                                                    e.currentTarget.src = "https://e621.net/images/guest.png";
                                                    e.currentTarget.onerror = null; // prevent loop
                                                }}
                                             />
                                         </div>
                                         <div className="flex-1 min-w-0">
                                             <div className="flex items-center justify-between mb-1">
                                                 <span 
                                                    className="text-xs font-bold text-e6-light cursor-pointer hover:underline"
                                                    onClick={() => {
                                                        onClose();
                                                        if(onSearchTag) onSearchTag(`user:${comment.creator}`);
                                                    }}
                                                 >
                                                    {comment.creator}
                                                 </span>
                                                 <span className="text-[10px] text-gray-400">{new Date(comment.created_at).toLocaleDateString()}</span>
                                             </div>
                                             <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                                                 {comment.body}
                                             </div>
                                             <div className="mt-1 flex items-center text-xs text-gray-500">
                                                <i className="fas fa-arrow-up text-green-500 mr-1"></i> {comment.score}
                                             </div>
                                         </div>
                                     </div>
                                 )
                             ))}
                         </div>
                     )}
                </div>

            </div>
        </div>
      </div>
    </div>
  );
};