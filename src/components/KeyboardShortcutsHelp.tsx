import { useTranslation, Trans } from 'react-i18next';
import { cn } from '../utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsHelp({ isOpen, onClose }: Props) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const shortcuts = [
    { key: '/', description: t('shortcutsHelp.focusSearchBar') },
    { key: 'R', description: t('shortcutsHelp.refreshPosts') },
    { key: 'X', description: t('shortcutsHelp.loadRandomPost') },
    { key: 'S', description: t('shortcutsHelp.openSettings') },
    { key: 'H', description: t('shortcutsHelp.goHome') },
    { key: 'F', description: t('shortcutsHelp.goFavorites') },
    { key: 'V', description: t('shortcutsHelp.toggleViewMode') },
    { key: 'Esc', description: t('shortcutsHelp.closeModal') },
    { key: '?', description: t('shortcutsHelp.showHelp') },
  ];

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
            {t('shortcutsHelp.title')}
          </h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface"
          >
            <i className="fas fa-times text-xl" />
          </button>
        </div>

        <div className="space-y-3">
          {shortcuts.map(({ key, description }) => (
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
          <Trans
            i18nKey="shortcutsHelp.footer"
            components={{ kbd: <kbd className="px-1.5 py-0.5 bg-surface-container-highest rounded-xs text-xs" /> }}
          />
        </p>
      </div>
    </div>
  );
}
