import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonRouterOutlet,
} from '@ionic/angular/standalone';
import { TopicComponent } from '../topics/topic/topic.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { tdesignSunFall, tdesignSunRising } from '@ng-icons/tdesign-icons';
import { CacheService } from '../state/cache.service';
import { GeoLocation, HDate, Zmanim } from '@hebcal/core';
import { addIcons } from 'ionicons';
import { homeOutline } from 'ionicons/icons';
import { RouterLink, RouterModule } from '@angular/router';

@Component({
  selector: 'app-main',
  templateUrl: './main.page.html',
  styleUrls: ['./main.page.scss'],
  standalone: true,
  providers: [CacheService],
  imports: [
    DatePipe,
    IonRouterOutlet,
    NgIconComponent,
    IonCol,
    IonRow,
    IonGrid,
    IonIcon,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    TopicComponent,
    RouterLink,
    RouterModule
  ],
  viewProviders: [provideIcons({ tdesignSunRising, tdesignSunFall })],
})
export class MainPage {
  cache = inject(CacheService);
  gloc = computed(() => {
    const { elevation, latitude, longitude, name, timeZoneId } =
      this.cache.location();
    return new GeoLocation(name, latitude, longitude, elevation, timeZoneId);
  });
  zmanim = computed(() => new Zmanim(this.gloc(), new Date()));
  sunrize = computed(() => this.zmanim().sunrise());
  sunset = computed(() => this.zmanim().sunset());

  hdate = signal(new HDate(new Date()));
  debDate = computed(() => this.hdate().renderGematriya(true));
  constructor() {
    addIcons({ homeOutline });
    console.log(this.sunrize());
    console.log(this.sunset());
    console.log(this.debDate());
  }
}
