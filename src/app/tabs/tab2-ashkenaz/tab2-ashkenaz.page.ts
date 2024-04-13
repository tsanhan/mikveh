import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { FirestoreService } from 'src/app/state/firestore.service';

@Component({
  selector: 'app-tab2-ashkenaz',
  templateUrl: './tab2-ashkenaz.page.html',
  styleUrls: ['./tab2-ashkenaz.page.scss'],
  standalone: true,
  providers: [FirestoreService],
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class Tab2AshkenazPage implements OnInit {
  firestore = inject(FirestoreService);

  constructor() { }

  ngOnInit() {
  }

}
