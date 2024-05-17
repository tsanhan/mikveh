import { enableProdMode, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import {
  IonicRouteStrategy,
  provideIonicAngular,
} from '@ionic/angular/standalone';

import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';
import { getApp, initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, indexedDBLocalPersistence, initializeAuth, provideAuth } from '@angular/fire/auth';
import {
  getAnalytics,
  provideAnalytics,
  ScreenTrackingService,
  UserTrackingService,
} from '@angular/fire/analytics';
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  provideAppCheck,
} from '@angular/fire/app-check';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getDatabase, provideDatabase } from '@angular/fire/database';
import { getFunctions, provideFunctions } from '@angular/fire/functions';
import { getMessaging, provideMessaging } from '@angular/fire/messaging';
import { getPerformance, providePerformance } from '@angular/fire/performance';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { IonicStorageModule } from '@ionic/storage-angular';
import {
  getRemoteConfig,
  provideRemoteConfig,
} from '@angular/fire/remote-config';

import { registerLocaleData } from '@angular/common';
import localeDeAt from '@angular/common/locales/he';
import { Capacitor } from '@capacitor/core';

registerLocaleData(localeDeAt, 'he');

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    importProvidersFrom(

      provideFirebaseApp(() =>
        initializeApp(environment.firebase)
      )
    ),
    importProvidersFrom(provideAuth(() => {
      if (Capacitor.isNativePlatform()) {
        return initializeAuth(getApp(), {
          persistence: indexedDBLocalPersistence
        });
      } else {
        return getAuth()
      }
    })),
    importProvidersFrom(provideAnalytics(() => getAnalytics())),
    ScreenTrackingService,
    UserTrackingService,
    // importProvidersFrom(
    //   provideAppCheck(() => {
    //     // TODO get a reCAPTCHA Enterprise here https://console.cloud.google.com/security/recaptcha?project=_
    //     // const provider = new ReCaptchaEnterpriseProvider(/* reCAPTCHA Enterprise site key */);
    //     // return initializeAppCheck(undefined, { provider, isTokenAutoRefreshEnabled: true });
    //   })
    // ),
    importProvidersFrom(provideFirestore(() => getFirestore())),
    importProvidersFrom(provideDatabase(() => getDatabase())),
    importProvidersFrom(provideFunctions(() => getFunctions())),
    importProvidersFrom(provideMessaging(() => getMessaging())),
    importProvidersFrom(providePerformance(() => getPerformance())),
    importProvidersFrom(provideStorage(() => getStorage())),
    importProvidersFrom(provideRemoteConfig(() => getRemoteConfig())),
    importProvidersFrom(IonicStorageModule.forRoot()),

  ],
});
