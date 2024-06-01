import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { IonGrid, IonCol, IonRow, IonImg, IonSkeletonText, IonText } from '@ionic/angular/standalone';
import { GeoLocation, HDate, Locale, Zmanim } from '@hebcal/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { CacheService } from 'src/app/state/cache.service';
import { DatePipe } from '@angular/common';
import { tdesignSunFall, tdesignSunRising } from '@ng-icons/tdesign-icons';

@Component({
  selector: 'app-day-times',
  templateUrl: './day-times.component.html',
  styleUrls: ['./day-times.component.scss'],
  standalone: true,
  imports: [IonText, IonSkeletonText, IonImg, IonGrid, IonCol, IonRow, NgIconComponent, DatePipe],
  viewProviders: [
    provideIcons({
      tdesignSunRising,
      tdesignSunFall,

    }),
  ],
})
export class DayTimesComponent implements OnInit {
  cache = inject(CacheService);

  gloc = computed(() => {
    const { elevation, latitude, longitude, name, timeZoneId } =
      this.cache.location();
    return new GeoLocation(name, latitude, longitude, elevation, timeZoneId);
  });
  zmanim = computed(() => new Zmanim(this.gloc(), new Date()));
  sunrize = computed(() => this.zmanim().sunrise());
  sunset = computed(() => this.zmanim().sunset());

  hdate = signal(new HDate(new Date()));
  debDate = computed(() => this.hdate().renderGematriya(true));

  constructor() {
    Locale.hebrewStripNikkud('he');
  }

  ngOnInit() {}
}
