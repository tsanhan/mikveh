import { inject, InjectionToken, Injector, runInInjectionContext } from '@angular/core';
import { doc, Firestore, getDocFromServer } from '@angular/fire/firestore';
import { getBytes, ref, Storage } from '@angular/fire/storage';
import { environment } from '../../environments/environment';
import { CONTENT_MAX_BYTES } from '../utils/content-validation';

export interface ContentSource {
  manifest(): Promise<unknown>;
  download(path: string): Promise<ArrayBuffer>;
}

export const CONTENT_SYNC_ENABLED = new InjectionToken<boolean>('ContentSyncEnabled', {
  providedIn: 'root', factory: () => environment.contentSyncEnabled,
});

export const CONTENT_SOURCE = new InjectionToken<ContentSource>('ContentSource', {
  providedIn: 'root',
  factory: () => {
    const injector = inject(Injector);
    // Resolve Firebase lazily: disabled sync and local startup do not need a connection.
    return {
      manifest: () => runInInjectionContext(injector, async () => {
        const snapshot = await getDocFromServer(doc(inject(Firestore), 'appContent/current'));
        return snapshot.data();
      }),
      download: path => runInInjectionContext(injector, () =>
        getBytes(ref(inject(Storage), path), CONTENT_MAX_BYTES)),
    };
  },
});
