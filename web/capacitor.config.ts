import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jiyoonlee.todoapp',
  appName: 'TODO App',
  webDir: 'dist',
  plugins: {
    Keyboard: {
      resize: 'body',
    },
  },
};

export default config;
