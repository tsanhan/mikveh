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
  IonItem,
  IonPopover,
  IonList,
  IonSegment,
  IonSegmentButton,
  IonLabel, IonInput } from '@ionic/angular/standalone';
import { TopicComponent } from '../topics/topic/topic.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { tdesignSunFall, tdesignSunRising } from '@ng-icons/tdesign-icons';
import { CacheService } from '../state/cache.service';
import { GeoLocation, HDate, Zmanim } from '@hebcal/core';
import { addIcons } from 'ionicons';
import { homeOutline, settingsOutline } from 'ionicons/icons';
import { RouterLink, RouterModule } from '@angular/router';
import {
  faSolidBookTanakh,
  faSolidScrollTorah,
} from '@ng-icons/font-awesome/solid';
import { jamCrown } from '@ng-icons/jam-icons';
import { SegmentCustomEvent } from '@ionic/core';

@Component({
  selector: 'app-main',
  templateUrl: './main.page.html',
  styleUrls: ['./main.page.scss'],
  standalone: true,
  providers: [CacheService],
  imports: [IonInput,
    IonLabel,
    IonSegmentButton,
    IonSegment,
    IonList,
    IonPopover,
    IonItem,
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
    RouterModule,
    CommonModule
  ],
  viewProviders: [
    provideIcons({
      tdesignSunRising,
      tdesignSunFall,
      jamCrown,
      faSolidScrollTorah,
      faSolidBookTanakh,
    }),
  ],
})
export class MainPage {
  cache = inject(CacheService);
  gloc = computed(() => {
    const { elevation, latitude, longitude, name, timeZoneId } = this.cache.location();
    return new GeoLocation(name, latitude, longitude, elevation, timeZoneId);
  });
  zmanim = computed(() => new Zmanim(this.gloc(), new Date()));
  sunrize = computed(() => this.zmanim().sunrise());
  sunset = computed(() => this.zmanim().sunset());

  hdate = signal(new HDate(new Date()));
  debDate = computed(() => this.hdate().renderGematriya(true));

  approach = this.cache.approach;
  approaches =  this.cache.approaches;

  constructor() {
    addIcons({ homeOutline, settingsOutline });
    // console.log(this.sunrize());
    // console.log(this.sunset());
    // console.log(this.debDate());
  }

  onSelectionChanged({detail:{value}}:SegmentCustomEvent) {
    console.log(value);
    this.cache.setApproach(value!.toString());
  }
}
