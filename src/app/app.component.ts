import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { CacheService } from './state/cache.service';
import { register } from 'swiper/element/bundle';
import { Locale } from '@hebcal/core';
Locale.hebrewStripNikkud('he');
register();

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  providers: [CacheService],
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {}
