import { useTranslation } from 'react-i18next';
import type { Settings } from '../../types';
import { cn } from '../../utils';

interface Props {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}

type ThemeOption = 'system' | 'light' | 'dark';

const THEMES: ThemeOption[] = ['system', 'light', 'dark'];
const LANGUAGES = [
  { value: 'en', labelKey: 'settings.appearance.language.en' },
  { value: 'ru', labelKey: 'settings.appearance.language.ru' },
] as const;

export function AppearanceTab({ settings, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 animate-fade-in">
      <h3 className="text-lg font-bold text-on-surface">
        {t('settings.appearance.title')}
      </h3>

      {/* Theme selector */}
      <div>
        <label className="block text-sm font-medium text-on-surface-variant mb-2">
          {t('settings.appearance.theme.label')}
        </label>
        <div className="flex gap-1 p-1 bg-surface-container-high rounded-lg">
          {THEMES.map((theme) => (
            <button
              key={theme}
              type="button"
              onClick={() => onChange({ theme })}
              className={cn(
                'flex-1 py-2 px-2 sm:px-3 rounded-md text-sm font-medium transition-colors',
                settings.theme === theme
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              )}
            >
              {t(`settings.appearance.theme.${theme}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Accent color picker */}
      <div>
        <label className="block text-sm font-medium text-on-surface-variant mb-2">
          {t('settings.appearance.accentColor.label')}
        </label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={settings.accentColor}
            onChange={(e) => onChange({ accentColor: e.target.value })}
            aria-label={t('settings.appearance.accentColor.label')}
            className="w-12 h-12 p-1 rounded-md border border-outline bg-surface cursor-pointer"
          />
          <span className="text-sm text-on-surface font-mono">
            {settings.accentColor}
          </span>
        </div>
      </div>

      {/* Language selector */}
      <div>
        <label className="block text-sm font-medium text-on-surface-variant mb-2">
          {t('settings.appearance.language.label')}
        </label>
        <select
          value={settings.language}
          onChange={(e) => onChange({ language: e.target.value })}
          className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:ring-2 focus:ring-primary outline-none"
        >
          {LANGUAGES.map(({ value, labelKey }) => (
            <option key={value} value={value}>
              {t(labelKey)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
