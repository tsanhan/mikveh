import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  signal,
  WritableSignal,
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

@Component({
  selector: 'app-main-swiper',
  standalone: true,
  imports: [CommonModule, IonAvatar, IonText, IonImg, IonGrid, IonCol, IonRow  ],
  templateUrl: './main-swiper.component.html',
  styleUrl: './main-swiper.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class MainSwiperComponent {
  cache = inject(CacheService);
  topics = this.cache.topics;
  approach = this.cache.approach;
  activeIndex: WritableSignal<number> = signal(0);
  title = computed(() => {
    const topics = this.topics();
    const index = this.activeIndex();
    const topic = topics[index];
    return topic['title'];
  });
  approachKey = computed(() => this.approach()['name']);
  subtitle = computed(() => this.topics()[this.activeIndex()]['subtitle']);
  constructor() {
    addIcons({ document, chevronForwardCircle, colorPalette, globe });
  }

  jsonEscape = (str: string) => {
    return str
      .replace(/\n/g, '\\\\n')
      .replace(/\r/g, '\\\\r')
      .replace(/\t/g, '\\\\t');
  };
}
