import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonGrid,
  IonRow,
  IonCol,
  IonList,
  IonItem,
  IonInput,
  IonButton,
  IonAvatar,
  IonText,
  IonIcon,
} from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-main-menu',
  templateUrl: './main-menu.page.html',
  styleUrls: ['./main-menu.page.scss'],
  standalone: true,
  imports: [
    IonIcon,
    IonText,
    IonAvatar,
    IonButton,
    IonInput,
    IonItem,
    IonList,
    IonCol,
    IonRow,
    IonGrid,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    RouterLink
  ],
})
export class MainMenuPage implements OnInit {
  countryCode: string = '972';
  wsNumber: string = '584298770';
  url: string =
    'https://wa.me/' +
    this.countryCode +
    this.wsNumber +
    '?text=%D7%A9%D7%9C%D7%95%D7%9D.%20%D7%90%D7%A0%D7%99%20%D7%A8%D7%95%D7%A6%D7%94%20%D7%9C%D7%A9%D7%90%D7%95%D7%9C%20%D7%A9%D7%90%D7%9C%D7%94%20%D7%91%D7%A0%D7%95%D7%92%D7%A2%20%D7%9C%D7%94%D7%9C%D7%9B%D7%95%D7%AA%20%D7%A0%D7%99%D7%93%D7%94.';
  constructor() {}

  ngOnInit() {}

  onClick() {}

  whatsapp() {
    window.open(this.url, '_blank');
  }
}
