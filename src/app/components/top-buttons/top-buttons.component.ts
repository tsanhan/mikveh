import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import {
  IonButtons,
  IonButton,
  IonIcon,
  IonAvatar,
  IonText,
  IonFab,
  IonFabButton,
  IonFabList,
  IonThumbnail,
  IonList,
  IonItem,
  IonLabel, IonImg } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logoWhatsapp } from 'ionicons/icons';
import { CacheService } from 'src/app/state/cache.service';
@Component({
  selector: 'app-top-buttons',
  standalone: true,
  imports: [IonImg,
    IonLabel,
    IonItem,
    IonList,
    IonFabList,
    IonFabButton,
    IonFab,
    IonText,
    IonAvatar,
    IonIcon,
    IonButton,
    IonButtons,
    CommonModule,
    IonThumbnail,
    IonImg
  ],
  templateUrl: './top-buttons.component.html',
  styleUrl: './top-buttons.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TopButtonsComponent implements AfterViewInit{
  cache = inject(CacheService);
  approaches = this.cache.approaches;
  selectedApproach = this.cache.approach;

  @ViewChild('shita', {read: ElementRef}) img: ElementRef;
  isShowApproaches = signal(false);
  countryCode: string = '972';
  wsNumber: string = '584298770';
  url: string =
    'https://wa.me/' +
    this.countryCode +
    this.wsNumber +
    '?text=%D7%A9%D7%9C%D7%95%D7%9D.%20%D7%90%D7%A0%D7%99%20%D7%A8%D7%95%D7%A6%D7%94%20%D7%9C%D7%A9%D7%90%D7%95%D7%9C%20%D7%A9%D7%90%D7%9C%D7%94%20%D7%91%D7%A0%D7%95%D7%92%D7%A2%20%D7%9C%D7%94%D7%9C%D7%9B%D7%95%D7%AA%20%D7%A0%D7%99%D7%93%D7%94.';

  constructor() {
    addIcons({ logoWhatsapp });

  }

  ngAfterViewInit(): void {
    // const shadowRoot = this.img.nativeElement.attachShadow({ mode: 'open' });
    // const sheet = new CSSStyleSheet;
    // sheet.replaceSync( `input { display: none; }`);
    // shadowRoot.adoptedStyleSheets = [ sheet ];

  }

  protected toggle(source: string) {
    // console.log('source', source);

    this.isShowApproaches.update((prev) => !prev);


  }

  protected onclose() {
    console.log('closed');
  }

  chooseApproach(approach: string) {
    this.cache.setApproach(approach);
    // this.isShowApproaches.set(false);
  }
}
