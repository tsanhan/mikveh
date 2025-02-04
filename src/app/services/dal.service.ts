import { inject, Injectable } from '@angular/core';
import { collection, collectionData, Firestore } from '@angular/fire/firestore';
import { from, Observable, of, switchMap, tap } from 'rxjs';
import { IMikveh } from '../interfaces/mikveh.interface';
import { query, limit, startAfter, getDocs } from '@angular/fire/firestore';
import { CacheService } from './cache.service';

@Injectable({
  providedIn: 'root',
})
export class DalService {
  afs = inject(Firestore);
  cache = inject(CacheService);

  constructor() {}

  getMikvehList():Observable<IMikveh[]> {
    return from(this.cache.getMikvehResults()).pipe(
      switchMap((cachedMikvehs: IMikveh[]) => {
        if (!!cachedMikvehs && cachedMikvehs.length) {
          return of(cachedMikvehs);
        }

//https://firestore.googleapis.com/v1/projects/mikveh-bo/databases/(default)/documents/mikvehs
        const mikvehsRef = collection(this.afs, 'mikvehs');
        const mikvehs = collectionData(mikvehsRef, {
          idField: 'id',
        }) as Observable<IMikveh[]>;
        return mikvehs.pipe(
          tap((mikvehs) => this.cache.storeMikvehResults(mikvehs))
        );
      })
    );
  }

  // This method is used to get a paginated list of mikvehs from Firestore
  // It uses the query() method to get the first page of mikvehs
  // If there are more mikvehs in the collection, it uses the startAfter() method
  // to get the next page of mikvehs
  // The method returns an array of IMikveh objects

  async getPaginatedMikvehList(pageSize: number, pageNumber: number) {
    const mikvehsRef = collection(this.afs, 'mikvehs'); // Get a reference to the mikvehs collection
    const offset = (pageNumber - 1) * pageSize; // Calculate the offset for the query to get the correct page of mikvehs from Firestore
    const firstPageQuery = query(mikvehsRef, startAfter(1), limit(pageSize)); // Create a query to get the first page of mikvehs
    const mikvehs = collectionData(firstPageQuery, {
      idField: 'id',
    }) as Observable<IMikveh[]>;

    const firstPageSnapshot = await getDocs(firstPageQuery); // Get the first page of mikvehs from Firestore
    let lastVisible = firstPageSnapshot.docs[offset - 1]; // Get the last visible document from the first page of mikvehs

    if (lastVisible) {
      const paginatedQuery = query(
        mikvehsRef,
        startAfter(lastVisible),
        limit(pageSize)
      );
      const paginatedSnapshot = await getDocs(paginatedQuery);
      return paginatedSnapshot.docs.map((doc) => doc.data() as IMikveh);
    } else {
      return firstPageSnapshot.docs.map((doc) => doc.data() as IMikveh);
    }
  }
}
