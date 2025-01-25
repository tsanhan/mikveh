import { Component, inject, OnInit } from '@angular/core';
import { LocationService } from 'src/app/services/location.service';

@Component({
  selector: 'app-day-times',
  templateUrl: './day-times.component.html',
  styleUrls: ['./day-times.component.scss'],
  standalone: true,
  imports: []
})
export class DayTimesComponent  implements OnInit {

  constructor() { }
  location = inject(LocationService)
  google = inject(Map)
  coordinates = this.location.coordinates;

  ngOnInit() {}

}
