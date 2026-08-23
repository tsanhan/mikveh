import { AsyncPipe, CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  ElementRef,
  inject,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { addIcons } from 'ionicons';
import {
  chevronForwardCircle,
  colorPalette,
  document,
  globe,
} from 'ionicons/icons';
import { IonAvatar, IonText, IonImg, IonGrid, IonCol, IonRow } from '@ionic/angular/standalone';
import { CacheService } from 'src/app/services/cache.service';
import { map, withLatestFrom } from 'rxjs';
import { ApproachService } from 'src/app/services/approach.service';
import { TopicNavigationService } from 'src/app/services/topic-navigation.service';

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
export class MainSwiperComponent implements AfterViewInit {
  cache = inject(CacheService);
  approach = inject(ApproachService);
  topicNavigation = inject(TopicNavigationService);
  destroyRef = inject(DestroyRef);

  @ViewChild('swiper') swiperRef!: ElementRef;

  topics$ = this.cache.topics$;
  approachKey$ = this.approach.approach$.pipe(map(approach => approach.contentKey ?? approach.name));

  constructor( ) {
    addIcons({ document, chevronForwardCircle, colorPalette, globe });

  }

  ngAfterViewInit() {
    const swiperElement = this.swiperRef.nativeElement;
    const enableRtl = () => swiperElement.swiper?.changeLanguageDirection('rtl');

    if (swiperElement.swiper) {
      enableRtl();
    } else {
      swiperElement.addEventListener('swiperinit', enableRtl, { once: true });
    }

    this.topicNavigation.topicRequests$
      .pipe(
        withLatestFrom(this.topics$),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(([topicId, topics]) => this.slideToTopic(topicId, topics));
  }

  private slideToTopic(topicId: string, topics: any[]) {
    const index = topics.findIndex(topic => topic.id === topicId);
    if (index < 0) return;

    setTimeout(() => {
      this.swiperRef?.nativeElement?.swiper?.slideTo(index);
    });
  }

  /**
   * Kept for existing deep links/bookmarks such as /approaches?topic=shiva-nekyim
   * if they were already opened before this internal navigation flow existed.
   */
  ngOnInit() {
    const params = new URLSearchParams(window.location.search);
    const topicId = params.get('topic');
    if (!topicId) return;
    window.history.replaceState({}, '', window.location.pathname);

    this.topics$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(topics => this.slideToTopic(topicId, topics));
  }

  jsonEscape = (str: string) => {
    return str
      .replace(/\n/g, '\\\\n')
      .replace(/\r/g, '\\\\r')
      .replace(/\t/g, '\\\\t');
  };
}
