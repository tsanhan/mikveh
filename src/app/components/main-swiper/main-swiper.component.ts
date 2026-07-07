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
import { ApproachService } from 'src/app/services/approach.service';

@Component({
    selector: 'app-main-swiper',
    imports: [CommonModule, 
      // IonAvatar, 
      // IonText,
      //  IonImg,
        IonGrid, IonCol, IonRow, AsyncPipe],
    templateUrl: './main-swiper.component.html',
    styleUrl: './main-swiper.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class MainSwiperComponent {
  cache = inject(CacheService);
    approach = inject(ApproachService);

  topics$ = this.cache.topics$;
  approachKey$ = this.approach.approach$.pipe(map(approach => approach.contentKey ?? approach.name));

  constructor( ) {
    addIcons({ document, chevronForwardCircle, colorPalette, globe });

  }

  jsonEscape = (str: string) => {
    return str
      .replace(/\n/g, '\\\\n')
      .replace(/\r/g, '\\\\r')
      .replace(/\t/g, '\\\\t');
  };
}
