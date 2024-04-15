import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar, IonButtons, IonBackButton } from '@ionic/angular/standalone';
import { TopicsPage } from 'src/app/topics/topics.page';
import { FirestoreService } from 'src/app/state/firestore.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-approaches',
  templateUrl: './approaches.page.html',
  styleUrls: ['./approaches.page.scss'],
  standalone: true,
  providers: [FirestoreService],
  imports: [IonBackButton, IonButtons,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    TopicsPage
  ],
})
export class ApproachesPage implements OnInit {
  firestore = inject(FirestoreService);
  activatedRoute = inject(ActivatedRoute);
  constructor() {

    this.activatedRoute.data.subscribe
    ((data) => {
      console.log(data);
    });
    this.activatedRoute.paramMap.subscribe((params) => {
      console.log(params.get('id'));
    });

  }

  ngOnInit() {}
}
