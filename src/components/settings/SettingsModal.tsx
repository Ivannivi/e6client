import { useState, useCallback, useEffect, KeyboardEvent, Key } from 'react';
import { useTranslation } from 'react-i18next';
import type { Settings, Account } from '../../types';
import { getActiveAccount, createAccount } from '../../types';
import { api } from '../../services/api';
import { cn } from '../../utils';
import { Ripple } from '../ui/Ripple';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdate: (s: Partial<Settings>) => void;
}

type Tab = 'account' | 'network' | 'blacklist' | 'shortcuts';

type SyncStatus = 'error' | 'success' | null;

const TABS: { id: Tab; labelKey: string; icon: string }[] = [
  { id: 'account', labelKey: 'settings.tabs.account', icon: 'fa-user' },
  { id: 'blacklist', labelKey: 'settings.tabs.blacklist', icon: 'fa-ban' },
  { id: 'network', labelKey: 'settings.tabs.network', icon: 'fa-network-wired' },
  { id: 'shortcuts', labelKey: 'settings.tabs.shortcuts', icon: 'fa-keyboard' },
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

          {activeTab === 'shortcuts' && <ShortcutsTab />}
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

  const handleAddAccount = () => {
    const newAccount = createAccount();
    setEditingAccount(newAccount);
    setShowKey(false);
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

  const isEditing = editingAccount !== null;
  const isExisting = editingAccount ? settings.accounts.some((a) => a.id === editingAccount.id) : false;

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
            <AccountWidget
              key={account.id}
              account={account}
              isActive={account.id === settings.activeAccountId}
              onSetActive={() => handleSetActive(account.id)}
              onEdit={() => handleEditAccount(account)}
              onDelete={() => handleDeleteAccount(account.id)}
            />
          ))}
        </div>
      )}

      {isEditing && editingAccount && (
        <AccountEditModal
          account={editingAccount}
          isExisting={isExisting}
          showKey={showKey}
          onToggleKey={() => setShowKey((v) => !v)}
          onChange={setEditingAccount}
          onSave={handleSaveAccount}
          onCancel={() => setEditingAccount(null)}
        />
      )}
    </div>
  );
}

function AccountEditModal({
  account,
  isExisting,
  showKey,
  onToggleKey,
  onChange,
  onSave,
  onCancel,
}: {
  account: Account;
  isExisting: boolean;
  showKey: boolean;
  onToggleKey: () => void;
  onChange: (account: Account) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-surface-container-high rounded-xl shadow-elevation-3 p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
            <i className="fas fa-user-edit text-primary" />
            {isExisting ? t('settings.account.editAccount') : t('settings.account.newAccount')}
          </h2>
          <button
            onClick={onCancel}
            className="text-on-surface-variant hover:text-on-surface"
          >
            <i className="fas fa-times text-xl" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              {t('settings.account.accountName')}
            </label>
            <input
              type="text"
              value={account.name}
              onChange={(e) => onChange({ ...account, name: e.target.value })}
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
              value={account.hostUrl}
              onChange={(e) => onChange({ ...account, hostUrl: e.target.value })}
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
                value={account.username}
                onChange={(e) => onChange({ ...account, username: e.target.value })}
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
                  value={account.apiKey}
                  onChange={(e) => onChange({ ...account, apiKey: e.target.value })}
                  className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:ring-2 focus:ring-primary outline-none pr-10"
                  placeholder="****************"
                />
                <button
                  onClick={onToggleKey}
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

        <div className="flex justify-end gap-2 pt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-on-surface-variant hover:text-on-surface"
          >
            {t('settings.cancel')}
          </button>
          <Ripple className="rounded-full bg-primary text-on-primary" onClick={onSave}>
            <span className="block px-4 py-2">{t('settings.account.saveAccount')}</span>
          </Ripple>
        </div>
      </div>
    </div>
  );
}

function AccountWidget({
  account,
  isActive,
  onSetActive,
  onEdit,
  onDelete,
}: {
  key?: Key;
  account: Account;
  isActive: boolean;
  onSetActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  let hostname = account.hostUrl;
  try { hostname = new URL(account.hostUrl).hostname; } catch { /* keep raw */ }

  return (
    <>
      <div
        className={cn(
          'p-4 rounded-lg border transition-colors cursor-pointer',
          isActive
            ? 'bg-primary/10 border-primary'
            : 'bg-surface-container-low border-outline-variant/40 hover:border-outline'
        )}
        onClick={() => setExpanded(true)}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center font-bold',
              isActive ? 'bg-primary text-on-primary' : 'bg-secondary-container text-on-secondary-container'
            )}>
              {account.name.charAt(0).toUpperCase()}
            </div>
            {isActive && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-surface" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-medium text-on-surface">{account.name}</span>
            <div className="text-xs text-on-surface-variant truncate">
              {account.username || t('settings.account.noUsername')} • {hostname}
            </div>
          </div>
          <i className="fas fa-chevron-up text-on-surface-variant text-sm" />
        </div>
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setExpanded(false)}
        >
          <div
            className="bg-surface-container-high rounded-xl shadow-elevation-3 p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <i className="fas fa-user-circle text-primary" />
                {account.name}
              </h2>
              <button
                onClick={() => setExpanded(false)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <i className="fas fa-times text-xl" />
              </button>
            </div>

            <div className="flex flex-col items-center mb-6">
              <div className="relative mb-3">
                <div className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl',
                  isActive ? 'bg-primary text-on-primary' : 'bg-secondary-container text-on-secondary-container'
                )}>
                  {account.name.charAt(0).toUpperCase()}
                </div>
                {isActive && (
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-surface-container-high" />
                )}
              </div>
              <span className="font-bold text-on-surface">{account.name}</span>
              <span className="text-sm text-on-surface-variant">
                {account.username || t('settings.account.noUsername')} • {hostname}
              </span>
              {isActive && (
                <span className="mt-2 text-xs text-green-600 font-medium">
                  <i className="fas fa-check-circle mr-1" />
                  {t('settings.account.currentlyActive')}
                </span>
              )}
            </div>

            <div className="space-y-2">
              {!isActive && (
                <button
                  onClick={() => { onSetActive(); setExpanded(false); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-on-primary font-medium hover:opacity-90 transition-opacity"
                >
                  <i className="fas fa-check-circle" />
                  {t('settings.account.setActive')}
                </button>
              )}
              <button
                onClick={() => { onEdit(); setExpanded(false); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-surface-container text-on-surface font-medium hover:bg-surface-container-highest transition-colors"
              >
                <i className="fas fa-edit" />
                {t('settings.account.edit')}
              </button>
              <button
                onClick={() => { onDelete(); setExpanded(false); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-error-container text-on-error-container font-medium hover:opacity-90 transition-opacity"
              >
                <i className="fas fa-trash" />
                {t('settings.account.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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

function ShortcutsTab() {
  const { t } = useTranslation();
  const shortcuts = [
    { key: '/', description: t('shortcutsHelp.focusSearchBar') },
    { key: 'R', description: t('shortcutsHelp.refreshPosts') },
    { key: 'X', description: t('shortcutsHelp.loadRandomPost') },
    { key: 'S', description: t('shortcutsHelp.openSettings') },
    { key: 'H', description: t('shortcutsHelp.goHome') },
    { key: 'F', description: t('shortcutsHelp.goFavorites') },
    { key: 'V', description: t('shortcutsHelp.toggleViewMode') },
    { key: 'Esc', description: t('shortcutsHelp.closeModal') },
  ];

  return (
    <div className="space-y-3 animate-fade-in">
      <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
        <i className="fas fa-keyboard text-primary" />
        {t('shortcutsHelp.title')}
      </h3>
      <div className="space-y-1">
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
      <p className="text-xs text-on-surface-variant">
        {t('shortcutsHelp.footer')}
      </p>
    </div>
  );
}

