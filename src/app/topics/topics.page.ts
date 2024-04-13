import { ChangeDetectionStrategy, Component, computed, inject, OnInit, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonGrid, IonRow, IonCol } from '@ionic/angular/standalone';
import { FirestoreService } from '../state/firestore.service';
import { Topics } from '../state/topics';
import { TopicComponent } from './topic/topic.component';

@Component({
  selector: 'app-topics',
  templateUrl: './topics.page.html',
  styleUrls: ['./topics.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [IonCol, IonRow, IonGrid, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TopicComponent]
})
export class ApproachesPage implements OnInit {
  firestore = inject(FirestoreService);
  topicsState: Signal<Topics> = this.firestore.topics
  topics = computed(() => Object.entries(this.topicsState()));
  constructor() {
    console.log(this.topics);
  }

  ngOnInit() {
  }

}
