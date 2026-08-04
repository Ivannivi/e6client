import { useState, useRef, FormEvent, ChangeEvent } from 'react';
import type { Settings } from '../types';
import { api, parseApiError } from '../services/api';
import { useToast } from '../hooks/useToast';
import { cn } from '../utils';
import { Ripple } from './Ripple';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
}

const RATING_OPTIONS: { value: 's' | 'q' | 'e'; label: string }[] = [
  { value: 's', label: 'Safe' },
  { value: 'q', label: 'Questionable' },
  { value: 'e', label: 'Explicit' },
];

export function UploadModal({ isOpen, onClose, settings }: Props) {
  const { success, error: showError } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [tags, setTags] = useState('');
  const [rating, setRating] = useState<'s' | 'q' | 'e'>('s');
  const [source, setSource] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
  };

  const resetForm = () => {
    setFile(null);
    setTags('');
    setRating('s');
    setSource('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    if (uploading) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!file) {
      showError('Please select a file to upload.');
      return;
    }

    const trimmedTags = tags.trim();
    if (!trimmedTags) {
      showError('Please enter at least one tag.');
      return;
    }

    setUploading(true);
    try {
      const postId = await api.createPost(settings, {
        file,
        tags: trimmedTags,
        rating,
        source: source.trim() || undefined,
      });
      success(`Upload complete! Post #${postId}`);
      resetForm();
      onClose();
    } catch (err) {
      showError(parseApiError(err));
    } finally {
      setUploading(false);
    }
  };

  const filePreviewUrl = file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null;

  return (
    <div className="fixed inset-0 z-50 bg-surface flex flex-col animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-10 px-4 sm:px-6 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 border-b border-outline-variant/40 flex justify-between items-center bg-surface-container">
        <h2 className="text-2xl font-bold text-on-surface">Upload</h2>
        <button
          onClick={handleClose}
          disabled={uploading}
          className="text-on-surface-variant hover:text-on-surface disabled:opacity-50"
        >
          <i className="fas fa-times text-xl" />
        </button>
      </header>

      {/* Content */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto bg-surface">
        <div className="max-w-3xl mx-auto w-full p-4 sm:p-6 space-y-6">
          {/* File picker */}
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-2">
              File
            </label>
            <label
              className={cn(
                'flex flex-col items-center justify-center w-full min-h-[160px] border-2 border-dashed rounded-lg cursor-pointer transition-colors',
                file
                  ? 'border-primary bg-primary/5'
                  : 'border-outline-variant bg-surface-container-low hover:bg-surface-container-high'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
              />
              {filePreviewUrl ? (
                <img
                  src={filePreviewUrl}
                  alt="Selected preview"
                  className="max-h-[200px] object-contain rounded-md"
                />
              ) : (
                <>
                  <i className="fas fa-cloud-upload-alt text-3xl text-on-surface-variant mb-2" />
                  <span className="text-sm text-on-surface-variant">
                    {file ? file.name : 'Click to select image or video'}
                  </span>
                </>
              )}
            </label>
            {file && !filePreviewUrl && (
              <p className="mt-2 text-sm text-on-surface">
                <i className="fas fa-file mr-1 text-on-surface-variant" />
                {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              Tags
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              disabled={uploading}
              placeholder="e.g. fox solo male"
              className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:ring-2 focus:ring-primary outline-none"
            />
            <p className="text-xs text-on-surface-variant mt-1">
              Separate tags with spaces.
            </p>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-2">
              Rating
            </label>
            <div className="flex gap-2">
              {RATING_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={uploading}
                  onClick={() => setRating(option.value)}
                  className={cn(
                    'flex-1 py-2 rounded-md text-sm font-medium transition-colors border',
                    rating === option.value
                      ? 'bg-primary text-on-primary border-primary'
                      : 'bg-surface text-on-surface border-outline hover:bg-surface-container-high'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              Source <span className="text-on-surface-variant/60">(optional)</span>
            </label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              disabled={uploading}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
        </div>
      </form>

      {/* Footer */}
      <footer className="sticky bottom-0 z-10 px-4 sm:px-6 py-4 border-t border-outline-variant/40 flex justify-end bg-surface-container-low pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <button
          type="button"
          onClick={handleClose}
          disabled={uploading}
          className="px-4 py-2 mr-2 text-on-surface-variant hover:text-on-surface disabled:opacity-50"
        >
          Cancel
        </button>
        <Ripple
          className="rounded-full bg-primary text-on-primary shadow-elevation-1"
          onClick={() => handleSubmit()}
          disabled={uploading}
        >
          <span className="block px-6 py-2 font-medium flex items-center">
            {uploading && <i className="fas fa-spinner fa-spin mr-2" />}
            {uploading ? 'Uploading...' : 'Upload'}
          </span>
        </Ripple>
      </footer>
    </div>
  );
}
