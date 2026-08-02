import { cn } from '../utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: '/', description: 'Focus search bar' },
  { key: 'R', description: 'Refresh posts' },
  { key: 'X', description: 'Load random post' },
  { key: 'S', description: 'Open settings' },
  { key: 'H', description: 'Go to home/browse' },
  { key: 'F', description: 'Go to favorites' },
  { key: 'V', description: 'Toggle view mode' },
  { key: 'Esc', description: 'Close modal/overlay' },
  { key: '?', description: 'Show this help' },
];

export function KeyboardShortcutsHelp({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-high rounded-xl shadow-elevation-3 p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <i className="fas fa-keyboard text-primary" />
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface"
          >
            <i className="fas fa-times text-xl" />
          </button>
        </div>

        <div className="space-y-3">
          {SHORTCUTS.map(({ key, description }) => (
            <div
              key={key}
              className="flex items-center justify-between py-2 border-b border-outline-variant/40 last:border-0"
            >
              <span className="text-on-surface-variant">{description}</span>
              <kbd className="px-3 py-1.5 bg-surface-container-highest rounded-sm text-sm font-mono font-bold text-on-surface">
                {key}
              </kbd>
            </div>
          ))}
        </div>

        <p className="mt-6 text-xs text-on-surface-variant text-center">
          Press <kbd className="px-1.5 py-0.5 bg-surface-container-highest rounded-xs text-xs">?</kbd> anytime to show this help
        </p>
      </div>
    </div>
  );
}
