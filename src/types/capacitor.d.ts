// @capacitor/core doesn't ambiently type the window.Capacitor runtime
// global it injects on native platforms - shapes actually used across the
// app are declared here so TypeScript is happy without importing each plugin.

interface CapacitorPluginListener {
  remove: () => void;
}

interface CapacitorAppPlugin {
  addListener(eventName: 'backButton', listener: () => void): Promise<CapacitorPluginListener>;
  addListener(eventName: 'appUrlOpen', listener: (data: { url: string }) => void): Promise<CapacitorPluginListener>;
  addListener(eventName: 'pause', listener: () => void): Promise<CapacitorPluginListener>;
  addListener(eventName: 'resume', listener: () => void): Promise<CapacitorPluginListener>;
  removeAllListeners(): Promise<void>;
  exitApp(): void;
}

interface CapacitorBrowserPlugin {
  open(options: { url: string; windowName?: string; toolbarColor?: string }): Promise<void>;
  close(): Promise<void>;
  addListener(eventName: 'browserFinished' | 'browserPageLoaded', listener: () => void): Promise<CapacitorPluginListener>;
  removeAllListeners(): Promise<void>;
}

interface CapacitorSharePlugin {
  share(options: { title?: string; text?: string; url?: string; files?: string[]; dialogTitle?: string }): Promise<{ activityType?: string }>;
  canShare(): Promise<{ value: boolean }>;
}

interface CapacitorFilesystemPlugin {
  writeFile(options: { path: string; data: string; directory?: string; recursive?: boolean; encoding?: 'utf8' | 'base64' | 'ascii' }): Promise<{ uri: string }>;
  readFile(options: { path: string; directory?: string; encoding?: 'utf8' | 'base64' | 'ascii' }): Promise<{ data: string }>;
  mkdir(options: { path: string; directory?: string; recursive?: boolean }): Promise<void>;
  getUri(options: { path: string; directory?: string }): Promise<{ uri: string }>;
}

interface CapacitorScreenOrientationPlugin {
  lock(options: { orientation: 'portrait' | 'portrait-primary' | 'portrait-secondary' | 'landscape' | 'landscape-primary' | 'landscape-secondary' | 'any' }): Promise<void>;
  unlock(): Promise<void>;
  orientation(): Promise<{ type: string }>;
  addListener(eventName: 'screenOrientationChange', listener: (data: { type: string }) => void): Promise<CapacitorPluginListener>;
  removeAllListeners(): Promise<void>;
}

interface CapacitorLocalNotification {
  title: string;
  body: string;
  id: number;
  schedule?: { at?: Date; in?: number };
}

interface CapacitorLocalNotificationsPlugin {
  requestPermissions(): Promise<{ display: 'granted' | 'denied' | 'prompt' }>;
  checkPermissions(): Promise<{ display: 'granted' | 'denied' | 'prompt' }>;
  schedule(options: { notifications: CapacitorLocalNotification[] }): Promise<{ notifications: { id: number }[] }>;
  cancel(options: { notifications: { id: number }[] }): Promise<void>;
  getPending(): Promise<{ notifications: CapacitorLocalNotification[] }>;
  addListener(eventName: 'localNotificationActionPerformed', listener: (data: { actionId: string; notification: CapacitorLocalNotification }) => void): Promise<CapacitorPluginListener>;
  removeAllListeners(): Promise<void>;
}

interface CapacitorPushNotificationsPlugin {
  register(): Promise<void>;
  requestPermissions(): Promise<{ receive: 'granted' | 'denied' | 'prompt' }>;
  checkPermissions(): Promise<{ receive: 'granted' | 'denied' | 'prompt' }>;
  getDeliveredNotifications(): Promise<{ notifications: unknown[] }>;
  removeAllDeliveredNotifications(): Promise<void>;
  addListener(eventName: 'registration', listener: (data: { value: string }) => void): Promise<CapacitorPluginListener>;
  addListener(eventName: 'registrationError', listener: (data: { error: string }) => void): Promise<CapacitorPluginListener>;
  addListener(eventName: 'pushNotificationReceived', listener: (data: unknown) => void): Promise<CapacitorPluginListener>;
  addListener(eventName: 'pushNotificationActionPerformed', listener: (data: { actionId: string; notification: unknown }) => void): Promise<CapacitorPluginListener>;
  removeAllListeners(): Promise<void>;
}

interface Window {
  Capacitor?: {
    Plugins: {
      App?: CapacitorAppPlugin;
      Browser?: CapacitorBrowserPlugin;
      Share?: CapacitorSharePlugin;
      Filesystem?: CapacitorFilesystemPlugin;
      ScreenOrientation?: CapacitorScreenOrientationPlugin;
      LocalNotifications?: CapacitorLocalNotificationsPlugin;
      PushNotifications?: CapacitorPushNotificationsPlugin;
    };
    isNativePlatform?: () => boolean;
    getPlatform?: () => string;
  };
  // Bridge exposed by electron/preload.js under contextIsolation.
  electronAPI?: {
    platform: string;
    versions: {
      node: string;
      chrome: string;
      electron: string;
    };
    saveFile: (options: { path: string; data: ArrayBuffer }) => Promise<{ ok: boolean; path?: string; error?: string }>;
    getDefaultDownloadPath: () => Promise<string>;
  };
}
