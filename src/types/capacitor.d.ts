// @capacitor/core doesn't ambiently type the window.Capacitor runtime
// global it injects on native platforms. The shapes below cover the
// plugin methods actually used by this app.

interface Window {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    Plugins: {
      App: {
        addListener: (
          eventName: 'backButton' | 'pause' | 'resume' | 'appUrlOpen',
          listener: (data?: { url?: string }) => void
        ) => Promise<{ remove: () => void }>;
        removeAllListeners: () => void;
        exitApp: () => void;
      };
      Browser: {
        open: (options: { url: string }) => Promise<void>;
      };
      Share: {
        share: (options: { title?: string; text?: string; url?: string }) => Promise<void>;
      };
      Filesystem: {
        requestPermissions: () => Promise<{ publicStorage?: string }>;
        writeFile: (options: {
          path: string;
          data: string;
          directory?: string;
          recursive?: boolean;
        }) => Promise<{ uri: string }>;
      };
      LocalNotifications: {
        requestPermissions: () => Promise<{ display: string }>;
        schedule: (options: {
          notifications: Array<{
            id: number;
            title: string;
            body: string;
            schedule?: { at?: Date; in?: number };
          }>;
        }) => Promise<void>;
        cancel: (options: { notifications: Array<{ id: number }> }) => Promise<void>;
      };
      PushNotifications: {
        requestPermissions: () => Promise<{ receive: string }>;
        register: () => void;
        addListener: (
          eventName: 'registration' | 'registrationError',
          listener: (token: { value: string } | { error: string }) => void
        ) => Promise<{ remove: () => void }>;
      };
      ScreenOrientation: {
        lock: (options: { orientation: string }) => Promise<void>;
        unlock: () => Promise<void>;
      };
    };
  };
}
