import { useTranslation } from 'react-i18next';
import type { Settings } from '../../types';
import { cn } from '../../utils';

interface AppearanceTabProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}

type Theme = 'system' | 'light' | 'dark';

const THEMES: { value: Theme; icon: string; labelKey: string }[] = [
  { value: 'system', icon: 'fa-desktop', labelKey: 'settings.appearance.themeSystem' },
  { value: 'light', icon: 'fa-sun', labelKey: 'settings.appearance.themeLight' },
  { value: 'dark', icon: 'fa-moon', labelKey: 'settings.appearance.themeDark' },
];

const ACCENTS: { name: string; color: string }[] = [
  { name: 'Blue', color: '#2e76b4' },
  { name: 'Green', color: '#2e7d32' },
  { name: 'Violet', color: '#7c4dff' },
  { name: 'Magenta', color: '#ad1457' },
  { name: 'Orange', color: '#ef6c00' },
  { name: 'Teal', color: '#00897b' },
];

const LANGUAGES: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
];

export function AppearanceTab({ settings, onChange }: AppearanceTabProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Theme */}
      <div>
        <h3 className="text-sm font-bold text-on-surface mb-3">{t('settings.appearance.theme')}</h3>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((theme) => (
            <button
              key={theme.value}
              type="button"
              onClick={() => onChange({ theme: theme.value })}
              className={cn(
                'flex flex-col items-center gap-2 py-4 rounded-lg border transition-colors',
                settings.theme === theme.value
                  ? 'bg-primary/10 border-primary text-on-surface'
                  : 'bg-surface-container-low border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-high'
              )}
            >
              <i className={cn('fas text-xl', theme.icon)} />
              <span className="text-xs font-medium">{t(theme.labelKey)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Accent color */}
      <div>
        <h3 className="text-sm font-bold text-on-surface mb-3">{t('settings.appearance.accentColor')}</h3>
        <div className="flex flex-wrap gap-3">
          {ACCENTS.map((accent) => (
            <button
              key={accent.color}
              type="button"
              title={accent.name}
              onClick={() => onChange({ accentColor: accent.color })}
              className={cn(
                'w-10 h-10 rounded-full border-2 transition-transform',
                settings.accentColor === accent.color
                  ? 'border-on-surface scale-110'
                  : 'border-outline-variant hover:scale-105'
              )}
              style={{ backgroundColor: accent.color }}
              aria-label={accent.name}
            />
          ))}
        </div>
      </div>

      {/* Language */}
      <div>
        <h3 className="text-sm font-bold text-on-surface mb-3">{t('settings.appearance.language')}</h3>
        <div className="grid grid-cols-2 gap-2">
          {LANGUAGES.map((language) => (
            <button
              key={language.code}
              type="button"
              onClick={() => onChange({ language: language.code })}
              className={cn(
                'py-3 rounded-lg border text-sm font-medium transition-colors',
                settings.language === language.code
                  ? 'bg-primary/10 border-primary text-on-surface'
                  : 'bg-surface-container-low border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-high'
              )}
            >
              {language.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
