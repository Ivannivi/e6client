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
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
            <i className="fas fa-keyboard text-e6-light" />
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <i className="fas fa-times text-xl" />
          </button>
        </div>

        <div className="space-y-3">
          {SHORTCUTS.map(({ key, description }) => (
            <div
              key={key}
              className="flex items-center justify-between py-2 border-b dark:border-gray-700 last:border-0"
            >
              <span className="text-gray-600 dark:text-gray-300">{description}</span>
              <kbd className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-mono font-bold text-gray-800 dark:text-gray-200 shadow-sm">
                {key}
              </kbd>
            </div>
          ))}
        </div>

        <p className="mt-6 text-xs text-gray-500 dark:text-gray-400 text-center">
          Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">?</kbd> anytime to show this help
        </p>
      </div>
    </div>
  );
}
