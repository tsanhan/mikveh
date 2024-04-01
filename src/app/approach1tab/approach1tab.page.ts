import { Component, inject } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '../explore-container/explore-container.component';
import { collection, collectionData, Firestore, FirestoreModule } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

interface Item {
  name: string
};

@Component({
  selector: 'app-approach1tab',
  templateUrl: 'approach1tab.page.html',
  styleUrls: ['approach1tab.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, ExploreContainerComponent,FirestoreModule],
})
export class Approach1Tab {
  // item$: Observable<Item[]>;
  firestore: Firestore = inject(Firestore);

  constructor() {
    const itemCollection = collection(this.firestore, 'approaches');
    collectionData(itemCollection).subscribe((items: any) => {
      console.log(items);
    });
  }
}
