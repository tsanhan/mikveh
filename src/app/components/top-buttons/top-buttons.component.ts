import { AsyncPipe, CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
  IonIcon,
  IonText,
  IonFab,
  IonFabButton,
  IonFabList,
  IonImg, IonButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { bookOutline, calendarOutline, logoWhatsapp, mapOutline } from 'ionicons/icons';
import { filter, map, shareReplay, startWith, tap } from 'rxjs';
import { CacheService } from 'src/app/state/cache.service';
@Component({
  selector: 'app-top-buttons',
  standalone: true,
  imports: [IonButton, IonImg,
    IonFabList,
    IonFabButton,
    IonFab,
    IonText,
    IonIcon,
    CommonModule,
    IonImg,
    RouterLink,
    RouterLinkActive,
    AsyncPipe,

  ],
  templateUrl: './top-buttons.component.html',
  styleUrl: './top-buttons.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TopButtonsComponent {
  cache = inject(CacheService);
  router = inject(Router);

  approaches = this.cache.approaches;
  selectedApproach = this.cache.approach;

  @ViewChild('shita', {read: ElementRef}) img: ElementRef;
  isShowApproaches = signal(false);
  countryCode: string = '972';
  wsNumber: string = '584298770';
  url: string =
    'https://wa.me/' +
    this.countryCode +
    this.wsNumber +
    '?text=%D7%A9%D7%9C%D7%95%D7%9D.%20%D7%90%D7%A0%D7%99%20%D7%A8%D7%95%D7%A6%D7%94%20%D7%9C%D7%A9%D7%90%D7%95%D7%9C%20%D7%A9%D7%90%D7%9C%D7%94%20%D7%91%D7%A0%D7%95%D7%92%D7%A2%20%D7%9C%D7%94%D7%9C%D7%9B%D7%95%D7%AA%20%D7%A0%D7%99%D7%93%D7%94.';

  rootRoute$ = this.router.events.pipe(
    filter((e) => e instanceof NavigationEnd),
    tap((e) => console.log('e', e)),
    map((e) => this.router.url),
    startWith(this.router.url),
    shareReplay(1)

  )

  constructor() {
    addIcons({calendarOutline,mapOutline,bookOutline,logoWhatsapp});
  }


  protected toggle(source: string) {
    // console.log('source', source);

    this.isShowApproaches.update((prev) => !prev);


  }

  protected onclose() {
    console.log('closed');
  }

  chooseApproach(approach: string) {
    this.cache.setApproach(approach);
    // this.isShowApproaches.set(false);
  }
}
