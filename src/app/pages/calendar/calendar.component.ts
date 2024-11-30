import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { IonContent } from "@ionic/angular/standalone";

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonContent]
})
export class CalendarComponent {
  constructor() { }
}
