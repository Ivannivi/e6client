import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.e6client.app',
  appName: 'e6client',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'app.e6client.local',
  },
  plugins: {
    App: {
      // Handle deep links via the appUrlOpen event.
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#488AFF',
    },
  },
};

export default config;