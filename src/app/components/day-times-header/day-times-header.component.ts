import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  IonGrid,
  IonCol,
  IonRow,
  IonImg,
  IonSkeletonText,
  IonText,
} from '@ionic/angular/standalone';
import { GeoLocation, HDate, Locale, Zmanim, Location } from '@hebcal/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { tdesignSunFall, tdesignSunRising } from '@ng-icons/tdesign-icons';

import { CacheService } from 'src/app/services/cache.service';
import '@hebcal/cities';
import { EventsService } from 'src/app/services/events.service';
import { map } from 'rxjs';

@Component({
  selector: 'app-day-times-header',
  templateUrl: './day-times-header.component.html',
  styleUrls: ['./day-times-header.component.scss'],
  standalone: true,
  imports: [IonText, IonImg, IonGrid, IonCol, IonRow, DatePipe, AsyncPipe],
  viewProviders: [
    provideIcons({
      tdesignSunRising,
      tdesignSunFall,

    }),
  ],
})
export class DayTimesHeaderComponent {
  cache = inject(CacheService);
  events = inject(EventsService);

  gloc = computed(() => {
    const { elevation, latitude, longitude, name, timeZoneId } =
      this.cache.location();
    return new GeoLocation(name, latitude, longitude, elevation, timeZoneId);
  });
  sunrize$ = this.events.sunrise$;
  sunset$ = this.events.sunset$;

  debDate$ = this.events.zmanim$.pipe(
    map((zmanim: HDate) => zmanim.renderGematriya())
  );

  constructor() {
    Locale.hebrewStripNikkud('he');
  }
}
