import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-tab1-chabad',
  templateUrl: './tab1-chabad.page.html',
  styleUrls: ['./tab1-chabad.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class Tab1ChabadPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
