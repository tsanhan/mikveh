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
  #approaches=  signal<any>({...approachesJson});
  approaches = computed(this.#approaches)

  constructor() {
    console.log(this.approaches());
  }



}
