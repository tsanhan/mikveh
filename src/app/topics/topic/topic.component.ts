import { ChangeDetectionStrategy, Component, computed, input, Input, OnInit, Signal } from '@angular/core';
import { Topic } from 'src/app/state/topics';
import { IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent } from "@ionic/angular/standalone";

@Component({
  selector: 'app-topic',
  templateUrl: './topic.component.html',
  styleUrls: ['./topic.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonCardContent, IonCardSubtitle, IonCardTitle, IonCard, IonCardHeader]
})
export class TopicComponent implements OnInit {
  topic = input.required<[string, Topic]>();
  id = computed(() => this.topic()[0]);
  topicObj = computed(() => this.topic()[1]);

  constructor() { }

  ngOnInit() {
  }

}
