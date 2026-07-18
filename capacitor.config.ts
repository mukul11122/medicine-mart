import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.janaushadhi.app',
  appName: 'JanAushadhi Generix',
  webDir: 'dist',
  server: {
    url: 'http://10.0.2.2:3001',
    cleartext: true
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
