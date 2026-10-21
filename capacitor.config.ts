import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.app', //  changed from appId: 'io.ionic.starter',
  appName: 'mikveh',
  webDir: 'www/browser',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_mikveh',
      iconColor: '#d66a84'
    },
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;
