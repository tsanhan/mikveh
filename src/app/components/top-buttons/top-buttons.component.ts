import { AsyncPipe, CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import {
  IonText,
  IonFab,
  IonFabButton,
  IonFabList,
  IonImg,
  IonButton,
  IonMenuButton,
  IonButtons,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  bookOutline,
  calendarOutline,
  logoWhatsapp,
  mapOutline,
} from 'ionicons/icons';
import { combineLatest, filter, map, shareReplay, startWith, tap } from 'rxjs';
import { ApproachName } from 'src/app/interfaces/approaches';
import { ApproachService } from 'src/app/services/approach.service';
import { CacheService } from 'src/app/services/cache.service';


@Component({
    selector: 'app-top-buttons',
    imports: [
        IonButtons,
        IonImg,
        IonFabList,
        IonFabButton,
        IonFab,
        IonText,
        CommonModule,
        IonImg,
        AsyncPipe,
        IonMenuButton,
    ],
    templateUrl: './top-buttons.component.html',
    styleUrl: './top-buttons.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TopButtonsComponent {
  cache = inject(CacheService);
  approach = inject(ApproachService);
  router = inject(Router);

  public ApproachNameEnum = ApproachName;

  approaches$ = this.approach.approaches$;
  selectedApproach$ = this.approach.approach$;
  selectedApproachNameHeb$ = combineLatest([
    this.selectedApproach$,
    this.approaches$,
  ]).pipe(
    map(([selectedApproach, approaches]) => {
      const { name } = selectedApproach;
      const { nameHeb } = approaches[name];
      return nameHeb;
    })
  );

  @ViewChild('shita', { read: ElementRef }) img: ElementRef;
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
  );

  constructor() {
    addIcons({ calendarOutline, mapOutline, bookOutline, logoWhatsapp });


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
