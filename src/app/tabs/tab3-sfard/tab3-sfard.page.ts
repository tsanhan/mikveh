import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-tab3-sfard',
  templateUrl: './tab3-sfard.page.html',
  styleUrls: ['./tab3-sfard.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class Tab3SfardPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
