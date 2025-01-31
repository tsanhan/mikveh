import { AsyncPipe, CommonModule, JsonPipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import {
  IonSearchbar,
  IonList,
  IonItem,
  IonAvatar,
  IonLabel,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  InfiniteScrollCustomEvent,
} from '@ionic/angular/standalone';
import {
  BehaviorSubject,
  combineLatest,
  map,
  of,
  Subject,
  switchMap,
  Observable,
} from 'rxjs';
import { DalService } from 'src/app/services/dal.service';
import { GoogleMap, MapMarker, MapAdvancedMarker } from '@angular/google-maps';
import { LocationService } from 'src/app/services/location.service';
@Component({
  selector: 'app-search-mikveh',
  templateUrl: './search-mikveh.component.html',
  styleUrls: ['./search-mikveh.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonInfiniteScrollContent,
    IonInfiniteScroll,
    IonLabel,
    IonAvatar,
    IonItem,
    IonList,
    IonSearchbar,
    AsyncPipe,
    JsonPipe,
    GoogleMap,
    MapMarker,
    MapAdvancedMarker
  ],
})
export class SearchMikvehComponent implements OnInit {
  dal = inject(DalService);
  location = inject(LocationService);

  items: string[] = ['asd', 'ddf', 'sdf'];
  center$: Observable<google.maps.LatLngLiteral> =
    this.location.coordinates.pipe(
      map((coordinates) => {
        const rtn: google.maps.LatLngLiteral = {
          lat: coordinates.lat,
          lng: coordinates.lng,
        };
        return rtn;
      })
    );

  keyStroke = new Subject<string>();

  results = combineLatest([this.dal.getMikvehList(), this.keyStroke]).pipe(
    map(([results, key]) => {
      const filtered = results.filter((result) => {
        return result.name.toLowerCase().includes(key.toLowerCase());
      });
      return filtered;
    })
  );



  constructor() {}
  ngOnInit(): void {
    this.generateItems();
  }

  search(event: any) {
    console.log(event.target.value);
  }

  private generateItems() {
    const count = this.items.length + 1;
    for (let i = 0; i < 50; i++) {
      this.items.push(`Item ${count + i}`);
    }
  }

  onIonInfinite(event: InfiniteScrollCustomEvent) {
    this.generateItems();
    setTimeout(() => {
      event.target.complete();
    }, 500);
  }
}
