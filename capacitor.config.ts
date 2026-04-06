import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // Must match the package name used in Play Console and App Store Connect
  appId: 'xyz.dearstranger.app',
  appName: 'Dear Stranger',
  // Points to the live deployment — no local bundle needed
  server: {
    url: 'https://dearstranger.xyz',
    cleartext: false,
  },
  // Android-specific settings
  android: {
    backgroundColor: '#04050f',
  },
  // iOS-specific settings
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#04050f',
  },
}

export default config
