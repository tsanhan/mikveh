import { computed, effect, inject, Injectable, signal } from '@angular/core';
import {
  collection,
  collectionData,
  Firestore,
  FirestoreModule,
  addDoc,
  setDoc,
  doc
} from '@angular/fire/firestore';


@Injectable({
  providedIn: 'root',
})
export class FirestoreService {
  firestore: Firestore = inject(Firestore);

  // topics = computed(() => {
  //   const topics = this.#topics();
  //   delete topics['default'];
  //   return topics;
  // })



  constructor() {
    // console.log(this.topics());

    // const itemCollection = collection(this.firestore, 'approaches');
    // const h = doc(this.firestore, 'approaches', 'chabad');
    // setDoc(h, this.approaches()['chabad']);
    // const ovadia = doc(this.firestore, 'approaches', 'sfarad_ovadia');
    // setDoc(ovadia, this.approaches()['sfarad_ovadia']);
    // const eliyahu = doc(this.firestore, 'approaches', 'sfarad_mordechai_eliyahu');
    // setDoc(eliyahu, this.approaches()['sfarad_mordechai_eliyahu']);
    // const t = doc(this.firestore, 'approaches', 'topics');
    // for (const key in this.approaches()['topics']) {
    //   const h = doc(this.firestore, 'approaches', 'sfarad_mordechai_eliyahu', 'topics', key);
    //   setDoc(h, {
    //     "title": "הפסק טהרה",
    //     "content": [
    //       {
    //         "type": "text",
    //         "data": "היו היה מידע"
    //       },
    //       {
    //         "data": "https://firebasestorage.googleapis.com/v0/b/mikveh-app.appspot.com/o/approaches%2F2I5GepZelWtdwLqmJxKf%2Fhefsek-taharah%2FSquare_of_white_cloth_for_purity_testing.jpg?alt=media&token=92aee9bf-ce87-490d-9d13-e120c8d54e9c",
    //         "type": "img"
    //       }
    //     ]
    //   });
    //   }
    }

}
