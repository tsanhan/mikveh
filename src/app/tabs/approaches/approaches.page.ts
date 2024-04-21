import { Component, inject, OnInit, effect, computed } from '@angular/core';
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
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-approaches',
  templateUrl: './approaches.page.html',
  styleUrls: ['./approaches.page.scss'],
  standalone: true,
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
  routeData = toSignal(this.activatedRoute.data);
  data = computed(() => {
    console.log("data", this.routeData());
  });
  constructor() {


  }

  ngOnInit() {}
}
