import { AsyncPipe, CommonModule, DatePipe } from '@angular/common';
import { Component, ElementRef, inject, OnInit, QueryList, Signal, ViewChild, ViewChildren, ChangeDetectionStrategy, signal } from '@angular/core';
import { IonSearchbar, IonButton, IonIcon, IonList, IonItem, IonSkeletonText } from '@ionic/angular/standalone';
import { BehaviorSubject, catchError, combineLatest, interval, map, Observable, shareReplay, tap, throttle } from 'rxjs';
import { DalService } from 'src/app/services/dal.service';
import { GoogleMap, MapMarker, MapAdvancedMarker } from '@angular/google-maps';
import { LocationService } from 'src/app/services/location.service';
import { IMikveh } from 'src/app/interfaces/mikveh.interface';
import { addIcons } from 'ionicons';
import { chevronDownOutline, chevronUpOutline, locationOutline } from 'ionicons/icons';
import { TranslateHebPipe } from 'src/app/pipes/translate-heb.pipe';
import { EventsService } from 'src/app/services/events.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { TelHighlightPipe } from 'src/app/pipes/tel-highlight.pipe';


@Component({
    selector: 'app-search-mikveh',
    templateUrl: './search-mikveh.component.html',
    styleUrls: ['./search-mikveh.component.scss'],
    imports: [IonIcon, IonButton,
        CommonModule,
        IonSearchbar,
        AsyncPipe,
        GoogleMap,
        MapAdvancedMarker,
        DatePipe,
        // IonList,
        TranslateHebPipe,
        TelHighlightPipe,
        // IonItem,
         IonSkeletonText],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchMikvehComponent implements OnInit {
  dal = inject(DalService);
  location = inject(LocationService);
  events = inject(EventsService);
  mikvehsLoading = signal(true);

  @ViewChild('googleMap', { static: true }) map!: GoogleMap;
  @ViewChildren('dynamicElement') dynamicElements!: QueryList<ElementRef>;
  @ViewChild('wrapper',{ static: true }) wrapper!: ElementRef;

  center$: Observable<google.maps.LatLngLiteral> = this.location.mapCenter$;
  isLoading = signal<boolean>(true);
  keyStroke = new BehaviorSubject<string>('');
  candleLighting$ = this.events.candleLighting$;

  candleLighting: Signal<Date> = toSignal<Date>(this.events.candleLighting$) as Signal<Date>;
  shabatHavdalah: Signal<Date> = toSignal<Date>(this.events.shabatHavdalah$) as Signal<Date>;

  mikvehs$ = combineLatest([
    this.dal.getMikvehList(),
    this.keyStroke,
    this.center$,
  ]).pipe(
    tap(() => this.isLoading.set(true)),
    throttle(() => interval(5000)),
    map(([results, key, center]) => {
      const filtered = results.filter((result:IMikveh) => {
        return (
          result.name.toLowerCase().includes(key.toLowerCase()) ||
          result.address.toLowerCase().includes(key.toLowerCase())
        );
      });
      const ordered = filtered.sort((a: IMikveh, b: IMikveh) => {
        const { lat: latC, lng: lngC } = center;
        const { lat: latA, lng: lngA } = a;
        const { lat: latB, lng: lngB } = b;
        const dis0 = this.location.calcDistance(latC, lngC, latA, lngA);
        const dis1 = this.location.calcDistance(latC, lngC, latB, lngB);
        const dis = dis0 - dis1 ;
        return dis;
      });
      return ordered;

    }),

    tap(() => this.isLoading.set(false)),
    catchError((err) => {
      console.error('Error fetching mikvehs:', err);
      this.isLoading.set(false);
      return [];
    })
  );

  constructor() {
        addIcons({ chevronDownOutline, chevronUpOutline, locationOutline});

  }
  ngOnInit(): void {
    // const options: google.maps.MapOptions {

    // }
    this.map.options = {};

    // this.generateItems();
  }

  search(event: any) {
    this.keyStroke.next(event.target.value);

  }

  flipOnClick($event: IMikveh) {
    $event['expanded'] = !$event['expanded'];
    // if($event.target instanceof HTMLElement) {
    //   $event.target.classList.toggle('flipped');
    // }

    console.log($event);
  }

  selectMikveh($event: MouseEvent) {
    console.log($event);
    // let target = $event.target as HTMLElement;


    // if($event.target instanceof HTMLElement) {
    //   while (!target.classList.contains('mikveh')) {
    //     target = target.parentElement as HTMLElement;
    //   }
    //   target.classList.toggle('expanded');
    // }
  }

  getAddHoursRelative(hours: number, date: Date, mikveh: IMikveh, path: string): Date {
    const newTime = new Date(date);
    const dateNum = newTime.setMinutes(date.getMinutes() + (hours*60));
    const a = new Date(dateNum);
    return a;
  }


  mapDragend() {
   const latLng: google.maps.LatLng = this.map.getCenter() as google.maps.LatLng;
    const  { lat, lng } = latLng.toJSON();
    this.location.coordinates$.next({lat,lng});
  }
  markClick($event: IMikveh) {
    this.location.setMapCenter($event.lat, $event.lng);
    // const elements:ElementRef[] = this.dynamicElements.toArray();
    // const element:ElementRef = elements.find((element) => element.nativeElement.id === $event.id) as ElementRef;
    // element.nativeElement.focus();
    // element.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start', alignToTop: true });
    this.wrapper.nativeElement.scrollTo({ behavior: 'smooth', top: 0});
    $event['expanded'] = true;

    console.log($event);
  }

  createPinElement(mikveh: IMikveh):google.maps.marker.AdvancedMarkerElementOptions {
    const rtn: google.maps.marker.AdvancedMarkerElementOptions = {
      title: mikveh.name,

    };
    return rtn;
  }



}
