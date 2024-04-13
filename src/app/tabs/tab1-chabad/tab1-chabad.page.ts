import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar, IonButtons, IonBackButton } from '@ionic/angular/standalone';
import { ApproachesPage } from 'src/app/topics/topics.page';
import { FirestoreService } from 'src/app/state/firestore.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-tab1-chabad',
  templateUrl: './tab1-chabad.page.html',
  styleUrls: ['./tab1-chabad.page.scss'],
  standalone: true,
  providers: [FirestoreService],
  imports: [IonBackButton, IonButtons,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    ApproachesPage
  ],
})
export class Tab1ChabadPage implements OnInit {
  firestore = inject(FirestoreService);
  activatedRoute = inject(ActivatedRoute);
  constructor() {

    console.log(this.activatedRoute.snapshot);
    this.activatedRoute.paramMap.subscribe((params) => {
      console.log(params.get('id'));
    });

  }

  ngOnInit() {}
}
