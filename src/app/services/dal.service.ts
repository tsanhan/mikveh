import { inject, Injectable } from '@angular/core';
import { from, Observable, of, switchMap, tap } from 'rxjs';
import { IMikveh } from '../interfaces/mikveh.interface';
import { CacheService } from './cache.service';

@Injectable({
  providedIn: 'root',
})
export class DalService {
  cache = inject(CacheService);

  constructor() {}

  getMikvehList():Observable<IMikveh[]> {
    return from(this.cache.getMikvehResults()).pipe(
      switchMap((cachedMikvehs: IMikveh[]) => {
        if (!!cachedMikvehs && cachedMikvehs.length) {
          return of(cachedMikvehs);
        }

//https://firestore.googleapis.com/v1/projects/mikveh-bo/databases/(default)/documents/mikvehs
        // const mikvehsRef = collection(this.afs, 'mikvehs');
        const mikvehs = of([]);
        // collectionData(mikvehsRef, {
        //   idField: 'id',
        // }) as Observable<IMikveh[]>;
        return mikvehs.pipe(
          tap((mikvehs) => this.cache.storeMikvehResults(mikvehs))
        );
      })
    );
  }

}
