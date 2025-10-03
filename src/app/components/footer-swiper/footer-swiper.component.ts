import { AsyncPipe, CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, inject } from '@angular/core';
import { IonAvatar, IonText } from "@ionic/angular/standalone";
import { CacheService } from 'src/app/services/cache.service';

@Component({
    selector: 'app-footer-swiper',
    imports: [IonText,
      //  IonAvatar,

        CommonModule, AsyncPipe
    ],
    templateUrl: './footer-swiper.component.html',
    styleUrl: './footer-swiper.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class FooterSwiperComponent {
  cache = inject(CacheService);
  topics$ = this.cache.topics$;

}
