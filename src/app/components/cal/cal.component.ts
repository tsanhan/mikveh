import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { IonDatetime } from '@ionic/angular/standalone';
import { Zmanim } from '@hebcal/core';
import { EventsService } from 'src/app/services/events.service';
import { AsyncPipe, DatePipe } from '@angular/common';

@Component({
  selector: 'app-cal',
  templateUrl: './cal.component.html',
  styleUrls: ['./cal.component.scss'],
  standalone: true,
  imports: [IonDatetime, AsyncPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalComponent {
  events = inject(EventsService);
  today = new Date().toISOString();

  now = new Date();
  israelTime = this.events.localISOString(this.now);

  constructor() {}

  onDateChange(event: CustomEvent) {
    console.log('onDateChange:', event);
  }


}
