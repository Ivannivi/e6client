import { useState, useCallback, useEffect, KeyboardEvent } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import type { Settings, Account } from '../types';
import { getActiveAccount, createAccount } from '../types';
import { api } from '../services/api';
import { cn } from '../utils';
import { Ripple } from './Ripple';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdate: (s: Partial<Settings>) => void;
}

type Tab = 'account' | 'network' | 'blacklist';

type SyncStatus = 'error' | 'success' | null;

const TABS: { id: Tab; labelKey: string; icon: string }[] = [
  { id: 'account', labelKey: 'settings.tabs.account', icon: 'fa-user' },
  { id: 'blacklist', labelKey: 'settings.tabs.blacklist', icon: 'fa-ban' },
  { id: 'network', labelKey: 'settings.tabs.network', icon: 'fa-network-wired' },
];

export function SettingsModal({ isOpen, onClose, settings, onUpdate }: Props) {
  const { t } = useTranslation();
  const [local, setLocal] = useState<Settings>(settings);
  const [activeTab, setActiveTab] = useState<Tab>('account');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(null);
  const [hasSynced, setHasSynced] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocal(settings);
      setHasSynced(false);
      setSyncMsg(null);
      setSyncStatus(null);
    }
  }, [isOpen, settings]);

  // Auto-sync blacklist when modal opens and account is logged in
  useEffect(() => {
    if (!isOpen || hasSynced) return;
    
    const activeAccount = getActiveAccount(local);
    if (activeAccount?.username && activeAccount?.apiKey) {
      setHasSynced(true);
      autoSyncBlacklist();
    }
  }, [isOpen, local.accounts, local.activeAccountId, hasSynced]);

  if (!isOpen) return null;

  const autoSyncBlacklist = async () => {
    const activeAccount = getActiveAccount(local);
    if (!activeAccount?.username) return;
    
    setSyncing(true);
    setSyncMsg(null);
    setSyncStatus(null);

    try {
      const user = await api.getUserByName(local, activeAccount.username);
      if (user?.blacklisted_tags) {
        const cloudTags = user.blacklisted_tags
          .split(/\r?\n/)
          .map((t) => t.trim())
          .filter(Boolean);
        const merged = [...new Set([...local.blacklistedTags, ...cloudTags])];
        setLocal((prev) => ({ ...prev, blacklistedTags: merged }));
        setSyncMsg(t('settings.blacklist.syncAuto', { count: cloudTags.length }));
        setSyncStatus('success');
      }
    } catch {
      // Silent fail for auto-sync
    } finally {
      setSyncing(false);
    }
  };

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
    const activeAccount = getActiveAccount(local);
    if (!activeAccount?.username) {
      setSyncMsg(t('settings.blacklist.syncNoAccount'));
      setSyncStatus('error');
      return;
    }
    setSyncing(true);
    setSyncMsg(null);
    setSyncStatus(null);

    try {
      const user = await api.getUserByName(local, activeAccount.username);
      if (user?.blacklisted_tags) {
        const cloudTags = user.blacklisted_tags
          .split(/\r?\n/)
          .map((t) => t.trim())
          .filter(Boolean);
        const newTags = cloudTags.filter((t) => !local.blacklistedTags.includes(t));
        const merged = [...new Set([...local.blacklistedTags, ...cloudTags])];
        setLocal((prev) => ({ ...prev, blacklistedTags: merged }));
        if (newTags.length > 0) {
          setSyncMsg(t('settings.blacklist.syncSynced', { count: newTags.length }));
        } else {
          setSyncMsg(t('settings.blacklist.syncUpToDate'));
        }
        setSyncStatus('success');
      } else {
        setSyncMsg(t('settings.blacklist.syncUserNotFound'));
        setSyncStatus('error');
      }
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 403) {
        setSyncMsg(t('settings.blacklist.syncFailed403'));
      } else if (status === 401) {
        setSyncMsg(t('settings.blacklist.syncFailed401'));
      } else {
        setSyncMsg(t('settings.blacklist.syncFailedGeneric'));
      }
      setSyncStatus('error');
    } finally {
      setSyncing(false);
    }
  };

  const toggle = (key: keyof Settings) => {
    setLocal((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-surface flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 px-4 sm:px-6 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 border-b border-outline-variant/40 flex justify-between items-center bg-surface-container">
        <h2 className="text-2xl font-bold text-on-surface">{t('settings.title')}</h2>
        <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
          <i className="fas fa-times text-xl" />
        </button>
      </header>

      {/* Tabs */}
      <nav className="flex border-b border-outline-variant/40 bg-surface-container-low overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-none min-w-[120px] py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors border-b-2',
              activeTab === tab.id
                ? 'border-primary text-primary bg-surface-container'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            )}
          >
            <i className={`fas ${tab.icon}`} />
            <span>{t(tab.labelKey)}</span>
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-surface">
        <div className="max-w-3xl mx-auto w-full p-4 sm:p-6 space-y-6">
          {activeTab === 'account' && (
            <AccountTab
              settings={local}
              onChange={setLocal}
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
              syncStatus={syncStatus}
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
        </div>
      </div>

      {/* Footer */}
      <footer className="sticky bottom-0 z-10 px-4 sm:px-6 py-4 border-t border-outline-variant/40 flex justify-end bg-surface-container-low pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <button
          onClick={onClose}
          className="px-4 py-2 mr-2 text-on-surface-variant hover:text-on-surface"
        >
          {t('settings.cancel')}
        </button>
        <Ripple
          className="rounded-full bg-primary text-on-primary shadow-elevation-1"
          onClick={handleSave}
        >
          <span className="block px-6 py-2 font-medium">{t('settings.saveChanges')}</span>
        </Ripple>
      </footer>
    </div>
  );
}

/* ---------- Sub-Components ---------- */

function Toggle({
  enabled,
  onToggle,
  color = 'bg-primary',
}: {
  enabled: boolean;
  onToggle: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn('relative w-12 h-6 rounded-full transition-colors duration-200', enabled ? color : 'bg-outline')}
    >
      <div
        className={cn(
          'absolute top-1 w-4 h-4 rounded-full bg-surface transition-transform duration-200',
          enabled ? 'left-7' : 'left-1'
        )}
      />
    </button>
  );
}

function AccountTab({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (settings: Settings) => void;
}) {
  const { t } = useTranslation();
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [showKey, setShowKey] = useState(false);

  const activeAccount = getActiveAccount(settings);

  const handleAddAccount = () => {
    const newAccount = createAccount();
    setEditingAccount(newAccount);
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount({ ...account });
    setShowKey(false);
  };

  const handleSaveAccount = () => {
    if (!editingAccount) return;
    
    const existingIndex = settings.accounts.findIndex((a) => a.id === editingAccount.id);
    let newAccounts: Account[];
    
    if (existingIndex >= 0) {
      newAccounts = [...settings.accounts];
      newAccounts[existingIndex] = editingAccount;
    } else {
      newAccounts = [...settings.accounts, editingAccount];
    }
    
    onChange({
      ...settings,
      accounts: newAccounts,
      // If this is the first account, set it as active
      activeAccountId: settings.activeAccountId || editingAccount.id,
    });
    setEditingAccount(null);
  };

  const handleDeleteAccount = (accountId: string) => {
    const newAccounts = settings.accounts.filter((a) => a.id !== accountId);
    onChange({
      ...settings,
      accounts: newAccounts,
      activeAccountId: settings.activeAccountId === accountId 
        ? (newAccounts[0]?.id || null)
        : settings.activeAccountId,
    });
  };

  const handleSetActive = (accountId: string) => {
    onChange({
      ...settings,
      activeAccountId: accountId,
    });
  };

  if (editingAccount) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-on-surface">
            {settings.accounts.find((a) => a.id === editingAccount.id) ? t('settings.account.editAccount') : t('settings.account.newAccount')}
          </h3>
          <button
            onClick={() => setEditingAccount(null)}
            className="text-on-surface-variant hover:text-on-surface"
          >
            <i className="fas fa-arrow-left mr-2" />
            {t('settings.account.back')}
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              {t('settings.account.accountName')}
            </label>
            <input
              type="text"
              value={editingAccount.name}
              onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
              className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:ring-2 focus:ring-primary outline-none"
              placeholder={t('settings.account.accountNamePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              {t('settings.account.hostUrl')}
            </label>
            <input
              type="text"
              value={editingAccount.hostUrl}
              onChange={(e) => setEditingAccount({ ...editingAccount, hostUrl: e.target.value })}
              className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:ring-2 focus:ring-primary outline-none"
              placeholder={t('settings.account.hostUrlPlaceholder')}
            />
            <p className="text-xs text-on-surface-variant mt-1">
              {t('settings.account.hostUrlHint')}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">
                {t('settings.account.username')}
              </label>
              <input
                type="text"
                value={editingAccount.username}
                onChange={(e) => setEditingAccount({ ...editingAccount, username: e.target.value })}
                className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:ring-2 focus:ring-primary outline-none"
                placeholder={t('settings.account.usernamePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">
                {t('settings.account.apiKey')}
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={editingAccount.apiKey}
                  onChange={(e) => setEditingAccount({ ...editingAccount, apiKey: e.target.value })}
                  className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:ring-2 focus:ring-primary outline-none pr-10"
                  placeholder="****************"
                />
                <button
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-3 top-2.5 text-on-surface-variant hover:text-on-surface"
                >
                  <i className={`fas ${showKey ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-secondary-container/50 p-3 rounded-md border border-secondary/30">
            <p className="text-xs text-on-secondary-container">
              <i className="fas fa-info-circle mr-1" />
              {t('settings.account.apiKeyHint')}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            onClick={() => setEditingAccount(null)}
            className="px-4 py-2 text-on-surface-variant hover:text-on-surface"
          >
            {t('settings.cancel')}
          </button>
          <Ripple className="rounded-full bg-primary text-on-primary" onClick={handleSaveAccount}>
            <span className="block px-4 py-2">{t('settings.account.saveAccount')}</span>
          </Ripple>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-on-surface">{t('settings.account.title')}</h3>
        {settings.accounts.length > 0 && (
          <Ripple className="rounded-full bg-primary text-on-primary" onClick={handleAddAccount}>
            <span className="block px-3 py-1.5 text-sm">
              <i className="fas fa-plus mr-2" />
              {t('settings.account.addAccount')}
            </span>
          </Ripple>
        )}
      </div>

      {settings.accounts.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant/40 rounded-lg p-8 text-center">
          <i className="fas fa-user-plus text-4xl text-on-surface-variant mb-4" />
          <p className="text-on-surface-variant mb-4">{t('settings.account.noAccounts')}</p>
          <Ripple className="inline-block rounded-full bg-primary text-on-primary" onClick={handleAddAccount}>
            <span className="block px-4 py-2">{t('settings.account.addFirstAccount')}</span>
          </Ripple>
        </div>
      ) : (
        <div className="space-y-3">
          {settings.accounts.map((account) => (
            <div
              key={account.id}
              className={cn(
                'p-4 rounded-lg border transition-colors',
                account.id === settings.activeAccountId
                  ? 'bg-primary/10 border-primary'
                  : 'bg-surface-container-low border-outline-variant/40'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center font-bold',
                    account.id === settings.activeAccountId
                      ? 'bg-primary text-on-primary'
                      : 'bg-secondary-container text-on-secondary-container'
                  )}>
                    {account.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-on-surface">{account.name}</span>
                      {account.id === settings.activeAccountId && (
                        <span className="text-xs bg-primary text-on-primary px-2 py-0.5 rounded-full">
                          {t('settings.account.active')}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-on-surface-variant">
                      {account.username || t('settings.account.noUsername')} • {new URL(account.hostUrl).hostname}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {account.id !== settings.activeAccountId && (
                    <button
                      onClick={() => handleSetActive(account.id)}
                      className="p-2 text-on-surface-variant hover:text-primary"
                      title={t('settings.account.setActive')}
                    >
                      <i className="fas fa-check-circle" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEditAccount(account)}
                    className="p-2 text-on-surface-variant hover:text-primary"
                    title={t('settings.account.edit')}
                  >
                    <i className="fas fa-edit" />
                  </button>
                  <button
                    onClick={() => handleDeleteAccount(account.id)}
                    className="p-2 text-on-surface-variant hover:text-error"
                    title={t('settings.account.delete')}
                  >
                    <i className="fas fa-trash" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeAccount && (
        <div className="bg-secondary-container/50 p-3 rounded-lg border border-secondary/30">
          <p className="text-sm text-on-secondary-container">
            <i className="fas fa-check-circle mr-2" />
            <Trans
              i18nKey="settings.account.usingAccount"
              values={{ name: activeAccount.name, host: new URL(activeAccount.hostUrl).hostname }}
              components={{ bold: <strong /> }}
            />
          </p>
        </div>
      )}
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
  syncStatus,
}: {
  settings: Settings;
  onToggle: (key: keyof Settings) => void;
  onAddTag: (e: KeyboardEvent<HTMLInputElement>) => void;
  onRemoveTag: (tag: string) => void;
  onSync: () => void;
  syncing: boolean;
  syncMsg: string | null;
  syncStatus: 'error' | 'success' | null;
}) {
  const { t } = useTranslation();
  const activeAccount = getActiveAccount(settings);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Tag list */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <label className="block text-sm font-medium text-on-surface-variant">{t('settings.blacklist.blacklistedTags')}</label>
            {syncing && (
              <span className="text-xs text-primary">
                <i className="fas fa-spinner fa-spin mr-1" />
                {t('settings.blacklist.syncing')}
              </span>
            )}
          </div>
          {activeAccount?.username && activeAccount?.apiKey && (
            <button
              onClick={onSync}
              disabled={syncing}
              className="text-xs px-2 py-1 bg-primary text-on-primary rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
              title={t('settings.blacklist.refreshTitle')}
            >
              <i className={cn('fas fa-sync-alt', syncing && 'fa-spin')} />
              <span className="hidden sm:inline">{t('settings.blacklist.refresh')}</span>
            </button>
          )}
        </div>
        {syncMsg && (
          <p className={cn('text-xs mb-2', syncStatus === 'error' ? 'text-error' : 'text-green-500')}>
            <i className={cn('fas mr-1', syncStatus === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle')} />
            {syncMsg}
          </p>
        )}

        <input
          type="text"
          onKeyDown={onAddTag}
          className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface mb-3"
          placeholder={t('settings.blacklist.tagPlaceholder')}
        />

        {settings.blacklistedTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {settings.blacklistedTags.map((tag) => (
              <span
                key={tag}
                className="py-1 text-sm flex items-center text-on-surface"
              >
                {tag}
                <button onClick={() => onRemoveTag(tag)} className="ml-1.5 text-error hover:opacity-80">
                  <i className="fas fa-times" />
                </button>
              </span>
            ))}
          </div>
        )}
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
  const { t } = useTranslation();
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg">
        <div>
          <span className="text-on-surface font-medium block">{t('settings.network.enableProxy')}</span>
          <span className="text-xs text-on-surface-variant">{t('settings.network.proxyHint')}</span>
        </div>
        <Toggle enabled={settings.enableProxy} onToggle={() => onToggle('enableProxy')} />
      </div>

      {settings.enableProxy && (
        <div className="p-4 border border-outline-variant rounded-lg bg-surface-container-low">
          <div className="flex justify-between items-end mb-1">
            <label className="block text-sm font-medium text-on-surface-variant">{t('settings.network.proxyLabel')}</label>
            <button onClick={onApplyDemo} className="text-xs text-primary hover:underline">
              {t('settings.network.useDemoProxy')}
            </button>
          </div>
          <input
            type="text"
            value={settings.proxyUrl}
            onChange={(e) => onProxyChange(e.target.value)}
            className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:ring-2 focus:ring-primary outline-none"
            placeholder={t('settings.network.proxyPlaceholder')}
          />
          <p className="text-xs text-orange-500 mt-2">
            <i className="fas fa-exclamation-triangle mr-1" />
            {t('settings.network.proxyWarning')}
          </p>
        </div>
      )}
    </div>
  );
}

