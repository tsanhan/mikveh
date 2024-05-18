import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, signal, WritableSignal } from '@angular/core';
import { CacheService } from './state/cache.service';
import { register } from 'swiper/element/bundle';
import { SegmentCustomEvent } from '@ionic/core';
import { addIcons } from 'ionicons';
import { chevronForwardCircle, colorPalette, document, globe } from 'ionicons/icons';

import Swiper from 'swiper';
import { DayTimesComponent } from './components/day-times/day-times.component';
import { TopButtonsComponent } from './components/top-buttons/top-buttons.component';
import { FooterSwiperComponent } from './components/footer-swiper/footer-swiper.component';
import { MainSwiperComponent } from './components/main-swiper/main-swiper.component';

register();

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  providers: [CacheService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    MainSwiperComponent,
    FooterSwiperComponent,
    DayTimesComponent,
    TopButtonsComponent
  ],

})
export class AppComponent {
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
