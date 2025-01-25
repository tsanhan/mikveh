import { Component, ChangeDetectionStrategy, OnInit, CUSTOM_ELEMENTS_SCHEMA, inject } from '@angular/core';
import { CacheService } from 'src/app/state/cache.service';
import { MainSwiperComponent } from '../../components/main-swiper/main-swiper.component';
import { FooterSwiperComponent } from '../../components/footer-swiper/footer-swiper.component';
import { TopButtonsComponent } from '../../components/top-buttons/top-buttons.component';
import { SegmentCustomEvent } from '@ionic/core';
import { addIcons } from 'ionicons';
import { chevronForwardCircle, colorPalette, document, globe } from 'ionicons/icons';
import { register } from 'swiper/element/bundle';
import { IonContent } from '@ionic/angular/standalone';
import { DayTimesHeaderComponent } from 'src/app/components/day-times-header/day-times-header.component';

register();

@Component({
  selector: 'app-approaches',
  templateUrl: './approaches.component.html',
  styleUrls: ['./approaches.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CacheService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    MainSwiperComponent,
    FooterSwiperComponent,
    DayTimesHeaderComponent,
    TopButtonsComponent,
    IonContent
  ],
})
export class ApproachesComponent{
  cache = inject(CacheService);
  topics = this.cache.topics;






  approach = this.cache.approach;
  approaches =  this.cache.approaches;
  darkMode = this.cache.darkMode;

  // onSlideChange({detail}: any) {
  //   const swiper: Swiper = detail[0];
  //   if (!swiper.destroyed) {
  //     this.activeIndex.set(swiper.activeIndex);
  //   }
  // }

  constructor() {
    addIcons({document, chevronForwardCircle,colorPalette, globe });
  }



  onSelectionChanged({detail:{value}}:SegmentCustomEvent) {
    console.log(value);
    this.cache.setApproach(value!.toString());
  }

  onToggleChangeDarkMode($event: CustomEvent) {
    this.cache.setDarkMode($event.detail.checked);
  }


}
