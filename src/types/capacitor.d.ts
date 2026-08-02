// @capacitor/core doesn't ambiently type the window.Capacitor runtime
// global it injects on native platforms - only the shape actually used
// in this app (the backButton listener) is declared here.
interface Window {
  Capacitor?: {
    Plugins: {
      App: {
        addListener: (eventName: 'backButton', listener: () => void) => void;
        removeAllListeners: () => void;
        exitApp: () => void;
      };
    };
  };
}
