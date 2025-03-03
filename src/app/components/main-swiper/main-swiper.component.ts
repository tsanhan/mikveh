import { AsyncPipe, CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
} from '@angular/core';
import { addIcons } from 'ionicons';
import {
  chevronForwardCircle,
  colorPalette,
  document,
  globe,
} from 'ionicons/icons';
import { IonAvatar, IonText, IonImg, IonGrid, IonCol, IonRow } from '@ionic/angular/standalone';
import { CacheService } from 'src/app/services/cache.service';
import { BehaviorSubject, combineLatest, map } from 'rxjs';

@Component({
  selector: 'app-main-swiper',
  standalone: true,
  imports: [CommonModule, IonAvatar, IonText, IonImg, IonGrid, IonCol, IonRow, AsyncPipe  ],
  templateUrl: './main-swiper.component.html',
  styleUrl: './main-swiper.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class MainSwiperComponent {
  cache = inject(CacheService);
  topics$ = this.cache.topics$;
  approachKey$ = this.cache.approach$.pipe(map(approach => approach['name']));

  constructor() {
    addIcons({ document, chevronForwardCircle, colorPalette, globe });
    this.cache.approach$.subscribe((topics) => {
      console.log(topics);
    });
  }

  jsonEscape = (str: string) => {
    return str
      .replace(/\n/g, '\\\\n')
      .replace(/\r/g, '\\\\r')
      .replace(/\t/g, '\\\\t');
  };
}
