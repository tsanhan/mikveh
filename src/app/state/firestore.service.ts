import { computed, effect, inject, Injectable, signal } from '@angular/core';
import {
  collection,
  collectionData,
  Firestore,
  FirestoreModule,
} from '@angular/fire/firestore';
import * as approachesJson from '../../assets/data/approaches.json' ;
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root',
})
export class FirestoreService {
  firestore: Firestore = inject(Firestore);
  activatedRoute = inject(ActivatedRoute);
  approach =toSignal( this.activatedRoute.paramMap.pipe(
    map((params) => params.get('id'))
  ));

  #approaches=  signal<any>({...approachesJson});
  approaches = computed(this.#approaches)

  hasLoaded = false;
  constructor() {
    console.log(this.approaches());
  }
  init = effect(() => {
    this.loadApproaches();
  });

  async loadApproaches() {
    // const initialApproaches = await firstValueFrom(collectionData(collection(this.firestore, 'approaches'), { idField: 'id' }));
    // this.#approaches.set(initialApproaches);
    this.hasLoaded = true;
  }

}
