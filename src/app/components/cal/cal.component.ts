import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { IonDatetime } from "@ionic/angular/standalone";

@Component({
  selector: 'app-cal',
  templateUrl: './cal.component.html',
  styleUrls: ['./cal.component.scss'],
  standalone: true,
    imports: [IonDatetime, ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalComponent  {

  constructor() { }


}
