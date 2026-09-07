import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mythri.health',
  appName: 'Mythri',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: [
      'mythri-properflow.onrender.com',
      '*.onrender.com',
    ]
  },
  plugins: {
    CapacitorCookies: {
      enabled: true,
    },
  },
};

export default config;
