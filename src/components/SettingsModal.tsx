import React, { useState } from 'react';
import { AppSettings } from '../types';
import { ApiService } from '../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdate: (s: Partial<AppSettings>) => void;
}

type Tab = 'account' | 'network' | 'blacklist' | 'appearance';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdate,
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<Tab>('account');
  const [showKey, setShowKey] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdate(localSettings);
    onClose();
  };

  const applyDemoProxy = () => {
      // CORSProxy.io is more reliable for forwarding Auth headers than allorigins
      setLocalSettings({
          ...localSettings,
          enableProxy: true,
          proxyUrl: 'https://corsproxy.io/?'
      });
  };

  const handleTagAdd = (tag: string) => {
      if(tag && !localSettings.blacklistedTags.includes(tag)) {
          setLocalSettings({
              ...localSettings,
              blacklistedTags: [...localSettings.blacklistedTags, tag]
          });
      }
  };

  const handleTagRemove = (tag: string) => {
      setLocalSettings({
          ...localSettings,
          blacklistedTags: localSettings.blacklistedTags.filter(t => t !== tag)
      });
  };

  const syncBlacklist = async () => {
      if (!localSettings.username) {
          setSyncMsg("Please enter a username first.");
          return;
      }
      setSyncing(true);
      setSyncMsg(null);
      try {
          const user = await ApiService.getUserProfile(localSettings, localSettings.username);
          if (user && user.blacklisted_tags) {
              const cloudTags = user.blacklisted_tags.split(/\r?\n/).filter(t => t.trim().length > 0);
              // Merge unique
              const uniqueTags = Array.from(new Set([...localSettings.blacklistedTags, ...cloudTags]));
              setLocalSettings(prev => ({
                  ...prev,
                  blacklistedTags: uniqueTags
              }));
              setSyncMsg(`Synced! Found ${cloudTags.length} tags.`);
          } else {
              setSyncMsg("User not found or empty blacklist.");
          }
      } catch (e: any) {
          console.error("Sync error:", e);
          if (e.response && e.response.status === 403) {
             setSyncMsg("Sync failed (403). Access denied. Try enabling the Proxy.");
          } else if (e.response && e.response.status === 401) {
             setSyncMsg("Sync failed (401). Invalid API Key.");
          } else {
             setSyncMsg("Sync failed. Check connection or Proxy.");
          }
      } finally {
          setSyncing(false);
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 z-10">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Settings</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            {[
                { id: 'account', label: 'Account', icon: 'fa-user' },
                { id: 'blacklist', label: 'Blacklist', icon: 'fa-ban' },
                { id: 'network', label: 'Network', icon: 'fa-network-wired' },
                { id: 'appearance', label: 'Display', icon: 'fa-palette' },
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as Tab)}
                    className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors border-b-2 ${
                        activeTab === tab.id 
                        ? 'border-e6-light text-e6-light bg-white dark:bg-gray-800' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    <i className={`fas ${tab.icon}`}></i>
                    <span className="hidden sm:inline">{tab.label}</span>
                </button>
            ))}
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto bg-white dark:bg-gray-800">
          
          {/* Account Tab */}
          {activeTab === 'account' && (
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
                            value={localSettings.username}
                            onChange={(e) => setLocalSettings({ ...localSettings, username: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-e6-light outline-none"
                            placeholder="e.g. user123"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API Key</label>
                        <div className="relative">
                            <input
                                type={showKey ? 'text' : 'password'}
                                value={localSettings.apiKey}
                                onChange={(e) => setLocalSettings({ ...localSettings, apiKey: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-e6-light outline-none pr-10"
                                placeholder="****************"
                            />
                            <button
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                            >
                                <i className={`fas ${showKey ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
          )}

          {/* Blacklist Tab */}
          {activeTab === 'blacklist' && (
            <div className="space-y-6 animate-fade-in">
                 <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div>
                        <span className="dark:text-gray-200 block font-medium">Safe Mode</span>
                        <span className="text-xs text-gray-500">Blur Explicit/Questionable posts in results</span>
                    </div>
                    <button
                        onClick={() => setLocalSettings({ ...localSettings, safeMode: !localSettings.safeMode })}
                        className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                        localSettings.safeMode ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                    >
                        <div
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                            localSettings.safeMode ? 'left-7' : 'left-1'
                        }`}
                        />
                    </button>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Blacklisted Tags</label>
                        <button 
                            onClick={syncBlacklist}
                            disabled={syncing}
                            className="text-xs px-2 py-1 bg-e6-light text-white rounded hover:bg-e6-base disabled:opacity-50"
                        >
                            {syncing ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sync-alt mr-1"></i>}
                            Sync from Account
                        </button>
                    </div>
                    {syncMsg && (
                        <div className={`text-xs mb-2 ${syncMsg.includes('failed') ? 'text-red-500' : 'text-green-500'}`}>
                            {syncMsg}
                        </div>
                    )}
                    
                    <input
                        type="text"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleTagAdd(e.currentTarget.value);
                                e.currentTarget.value = '';
                            }
                        }}
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-2"
                        placeholder="Type tag and press Enter to add..."
                    />
                    
                    <div className="bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-2 min-h-[150px] max-h-[300px] overflow-y-auto">
                        {localSettings.blacklistedTags.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-4">No blacklisted tags.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {localSettings.blacklistedTags.map(tag => (
                                    <span key={tag} className="px-2 py-1 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded text-sm flex items-center shadow-sm">
                                        {tag}
                                        <button onClick={() => handleTagRemove(tag)} className="ml-2 text-red-500 hover:text-red-700">
                                            <i className="fas fa-times"></i>
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
          )}

          {/* Network Tab */}
          {activeTab === 'network' && (
             <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                    <span className="dark:text-gray-200 font-medium block">Enable Custom Proxy/Host</span>
                    <span className="text-xs text-gray-500">Route requests through a custom URL to bypass CORS</span>
                </div>
                <button
                  onClick={() => setLocalSettings({ ...localSettings, enableProxy: !localSettings.enableProxy })}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                    localSettings.enableProxy ? 'bg-e6-light' : 'bg-gray-400'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                      localSettings.enableProxy ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {localSettings.enableProxy && (
                <div className="p-4 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                   <div className="flex justify-between items-end mb-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Proxy / Base URL</label>
                        <button 
                            onClick={applyDemoProxy}
                            className="text-xs text-e6-light hover:underline"
                        >
                            Use Public Demo Proxy
                        </button>
                   </div>
                   <input
                      type="text"
                      value={localSettings.proxyUrl}
                      onChange={(e) => setLocalSettings({ ...localSettings, proxyUrl: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-e6-light outline-none"
                      placeholder="http://localhost:8080 or https://corsproxy.io/?"
                    />
                    <p className="text-xs text-orange-500 mt-2">
                        <i className="fas fa-exclamation-triangle mr-1"></i>
                        e621.net blocks direct browser requests. Use a CORS proxy.
                    </p>
                </div>
              )}
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
             <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="dark:text-gray-200">Dark Mode</span>
                <button
                    onClick={() => setLocalSettings({ ...localSettings, darkMode: !localSettings.darkMode })}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                    localSettings.darkMode ? 'bg-e6-light' : 'bg-gray-400'
                    }`}
                >
                    <div
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                        localSettings.darkMode ? 'left-7' : 'left-1'
                    }`}
                    />
                </button>
                </div>
             </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t dark:border-gray-700 flex justify-end bg-gray-50 dark:bg-gray-800 rounded-b-xl sticky bottom-0 z-10">
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
        </div>
      </div>
    </div>
  );
};