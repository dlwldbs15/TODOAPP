import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.todoapp.app',
  appName: 'TODO App',
  webDir: 'dist',
  plugins: {
    Keyboard: {
      resize: 'body',
    },
  },
};

export default config;
