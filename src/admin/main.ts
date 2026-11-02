import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { getApp, initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { environment } from '../environments/environment';
import { AdminComponent } from './admin.component';

if (environment.production) enableProdMode();

bootstrapApplication(AdminComponent, {
  providers: [
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth(getApp())),
    provideFirestore(() => getFirestore(getApp())),
    provideStorage(() => getStorage(getApp())),
  ],
}).catch(error => console.error('Admin startup failed', error));
