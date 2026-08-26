import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.siterix.cooknotes',
  appName: 'CookNotes',
  webDir: 'dist',
  // CookNotes runs on a full-stack (SSR + server functions) build, so there is no
  // static bundle that can boot from file://. The native shell loads the deployed
  // app instead — this is what fixes the blank white screen on real devices.
  server: {
    url: 'https://elegant-cook-whisper.lovable.app',
    cleartext: false,
    androidScheme: 'https',
    allowNavigation: ['elegant-cook-whisper.lovable.app'],
  },
  android: {
    webContentsDebuggingEnabled: false,
  },
};

export default config;
