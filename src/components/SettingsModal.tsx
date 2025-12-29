import { useState, useCallback, KeyboardEvent } from 'react';
import type { Settings } from '../types';
import { api } from '../services/api';
import { cn } from '../utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdate: (s: Partial<Settings>) => void;
}

type Tab = 'account' | 'network' | 'blacklist' | 'appearance';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'account', label: 'Account', icon: 'fa-user' },
  { id: 'blacklist', label: 'Blacklist', icon: 'fa-ban' },
  { id: 'network', label: 'Network', icon: 'fa-network-wired' },
  { id: 'appearance', label: 'Display', icon: 'fa-palette' },
];

export function SettingsModal({ isOpen, onClose, settings, onUpdate }: Props) {
  const [local, setLocal] = useState<Settings>(settings);
  const [activeTab, setActiveTab] = useState<Tab>('account');
  const [showKey, setShowKey] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdate(local);
    onClose();
  };

  const applyDemoProxy = () => {
    setLocal((prev) => ({
      ...prev,
      enableProxy: true,
      proxyUrl: 'https://corsproxy.io/?',
    }));
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !local.blacklistedTags.includes(trimmed)) {
      setLocal((prev) => ({
        ...prev,
        blacklistedTags: [...prev.blacklistedTags, trimmed],
      }));
    }
  };

  const removeTag = (tag: string) => {
    setLocal((prev) => ({
      ...prev,
      blacklistedTags: prev.blacklistedTags.filter((t) => t !== tag),
    }));
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      addTag(e.currentTarget.value);
      e.currentTarget.value = '';
    }
  };

  const syncBlacklist = async () => {
    if (!local.username) {
      setSyncMsg('Please enter a username first.');
      return;
    }
    setSyncing(true);
    setSyncMsg(null);

    try {
      const user = await api.getUserByName(local, local.username);
      if (user?.blacklisted_tags) {
        const cloudTags = user.blacklisted_tags
          .split(/\r?\n/)
          .map((t) => t.trim())
          .filter(Boolean);
        const merged = [...new Set([...local.blacklistedTags, ...cloudTags])];
        setLocal((prev) => ({ ...prev, blacklistedTags: merged }));
        setSyncMsg(`Synced! Found ${cloudTags.length} tags.`);
      } else {
        setSyncMsg('User not found or empty blacklist.');
      }
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 403) {
        setSyncMsg('Sync failed (403). Access denied. Try enabling the Proxy.');
      } else if (status === 401) {
        setSyncMsg('Sync failed (401). Invalid API Key.');
      } else {
        setSyncMsg('Sync failed. Check connection or Proxy.');
      }
    } finally {
      setSyncing(false);
    }
  };

  const toggle = (key: keyof Settings) => {
    setLocal((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <header className="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 z-10">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Settings</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <i className="fas fa-times text-xl" />
          </button>
        </header>

        {/* Tabs */}
        <nav className="flex border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors border-b-2',
                activeTab === tab.id
                  ? 'border-e6-light text-e6-light bg-white dark:bg-gray-800'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              <i className={`fas ${tab.icon}`} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto bg-white dark:bg-gray-800">
          {activeTab === 'account' && (
            <AccountTab
              settings={local}
              showKey={showKey}
              onToggleShowKey={() => setShowKey((v) => !v)}
              onChange={(patch) => setLocal((prev) => ({ ...prev, ...patch }))}
            />
          )}

          {activeTab === 'blacklist' && (
            <BlacklistTab
              settings={local}
              onToggle={toggle}
              onAddTag={handleTagKeyDown}
              onRemoveTag={removeTag}
              onSync={syncBlacklist}
              syncing={syncing}
              syncMsg={syncMsg}
            />
          )}

          {activeTab === 'network' && (
            <NetworkTab
              settings={local}
              onToggle={toggle}
              onProxyChange={(url) => setLocal((prev) => ({ ...prev, proxyUrl: url }))}
              onApplyDemo={applyDemoProxy}
            />
          )}

          {activeTab === 'appearance' && (
            <AppearanceTab settings={local} onToggle={toggle} />
          )}
        </div>

        {/* Footer */}
        <footer className="p-6 border-t dark:border-gray-700 flex justify-end bg-gray-50 dark:bg-gray-800 rounded-b-xl sticky bottom-0 z-10">
          <button
            onClick={onClose}
            className="px-4 py-2 mr-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-e6-light hover:bg-e6-base text-white rounded-lg shadow-lg transform active:scale-95 transition-all"
          >
            Save Changes
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ---------- Sub-Components ---------- */

function Toggle({
  enabled,
  onToggle,
  color = 'bg-e6-light',
}: {
  enabled: boolean;
  onToggle: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn('relative w-12 h-6 rounded-full transition-colors duration-200', enabled ? color : 'bg-gray-400')}
    >
      <div
        className={cn(
          'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200',
          enabled ? 'left-7' : 'left-1'
        )}
      />
    </button>
  );
}

function AccountTab({
  settings,
  showKey,
  onToggleShowKey,
  onChange,
}: {
  settings: Settings;
  showKey: boolean;
  onToggleShowKey: () => void;
  onChange: (patch: Partial<Settings>) => void;
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
        <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2">Login Info</h3>
        <p className="text-xs text-blue-700 dark:text-blue-200">
          Enter your e621 username and API Key to enable voting, favorites, and to access your personal settings.
          API Key is found in your e621 Account Settings &gt; API.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
          <input
            type="text"
            value={settings.username}
            onChange={(e) => onChange({ username: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-e6-light outline-none"
            placeholder="e.g. user123"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API Key</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={settings.apiKey}
              onChange={(e) => onChange({ apiKey: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-e6-light outline-none pr-10"
              placeholder="****************"
            />
            <button
              onClick={onToggleShowKey}
              className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700 dark:text-gray-400"
            >
              <i className={`fas ${showKey ? 'fa-eye-slash' : 'fa-eye'}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BlacklistTab({
  settings,
  onToggle,
  onAddTag,
  onRemoveTag,
  onSync,
  syncing,
  syncMsg,
}: {
  settings: Settings;
  onToggle: (key: keyof Settings) => void;
  onAddTag: (e: KeyboardEvent<HTMLInputElement>) => void;
  onRemoveTag: (tag: string) => void;
  onSync: () => void;
  syncing: boolean;
  syncMsg: string | null;
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* NSFW Toggle */}
      <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <div>
          <span className="dark:text-gray-200 block font-medium">NSFW Mode</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Enable adult content (Questionable/Explicit)</span>
        </div>
        <Toggle enabled={settings.nsfwEnabled} onToggle={() => onToggle('nsfwEnabled')} color="bg-red-500" />
      </div>

      {/* Safe Mode (blur) */}
      {settings.nsfwEnabled && (
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div>
            <span className="dark:text-gray-200 block font-medium">Safe Mode</span>
            <span className="text-xs text-gray-500">Blur Explicit/Questionable posts in results</span>
          </div>
          <Toggle enabled={settings.safeMode} onToggle={() => onToggle('safeMode')} color="bg-green-500" />
        </div>
      )}

      {/* Tag list */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Blacklisted Tags</label>
          <button
            onClick={onSync}
            disabled={syncing}
            className="text-xs px-2 py-1 bg-e6-light text-white rounded hover:bg-e6-base disabled:opacity-50"
          >
            {syncing ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-sync-alt mr-1" />}
            Sync from Account
          </button>
        </div>
        {syncMsg && (
          <p className={cn('text-xs mb-2', syncMsg.includes('failed') ? 'text-red-500' : 'text-green-500')}>
            {syncMsg}
          </p>
        )}

        <input
          type="text"
          onKeyDown={onAddTag}
          className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-2"
          placeholder="Type tag and press Enter to add..."
        />

        <div className="bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-2 min-h-[150px] max-h-[300px] overflow-y-auto">
          {settings.blacklistedTags.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No blacklisted tags.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {settings.blacklistedTags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded text-sm flex items-center shadow-sm"
                >
                  {tag}
                  <button onClick={() => onRemoveTag(tag)} className="ml-2 text-red-500 hover:text-red-700">
                    <i className="fas fa-times" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NetworkTab({
  settings,
  onToggle,
  onProxyChange,
  onApplyDemo,
}: {
  settings: Settings;
  onToggle: (key: keyof Settings) => void;
  onProxyChange: (url: string) => void;
  onApplyDemo: () => void;
}) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div>
          <span className="dark:text-gray-200 font-medium block">Enable Custom Proxy/Host</span>
          <span className="text-xs text-gray-500">Route requests through a custom URL to bypass CORS</span>
        </div>
        <Toggle enabled={settings.enableProxy} onToggle={() => onToggle('enableProxy')} />
      </div>

      {settings.enableProxy && (
        <div className="p-4 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50">
          <div className="flex justify-between items-end mb-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Proxy / Base URL</label>
            <button onClick={onApplyDemo} className="text-xs text-e6-light hover:underline">
              Use Public Demo Proxy
            </button>
          </div>
          <input
            type="text"
            value={settings.proxyUrl}
            onChange={(e) => onProxyChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-e6-light outline-none"
            placeholder="http://localhost:8080 or https://corsproxy.io/?"
          />
          <p className="text-xs text-orange-500 mt-2">
            <i className="fas fa-exclamation-triangle mr-1" />
            e621.net blocks direct browser requests. Use a CORS proxy.
          </p>
        </div>
      )}
    </div>
  );
}

function AppearanceTab({
  settings,
  onToggle,
}: {
  settings: Settings;
  onToggle: (key: keyof Settings) => void;
}) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <span className="dark:text-gray-200">Dark Mode</span>
        <Toggle enabled={settings.darkMode} onToggle={() => onToggle('darkMode')} />
      </div>
    </div>
  );
}