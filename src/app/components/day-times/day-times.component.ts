import { AsyncPipe, JsonPipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { GeoLocation, Location, Zmanim } from '@hebcal/core';

import { map } from 'rxjs';
import { LocationService } from 'src/app/services/location.service';

@Component({
  selector: 'app-day-times',
  templateUrl: './day-times.component.html',
  styleUrls: ['./day-times.component.scss'],
  standalone: true,
  imports: [AsyncPipe, JsonPipe],
})
export class DayTimesComponent {
  constructor() {}
  location = inject(LocationService);
  coordinates = this.location.coordinates;
  zmazim = this.coordinates.pipe(
    map(({ lat, lng }) => {
      const loc = new Location(lat, lng, true, 'Asia/Jerusalem');
      const now = new Date();
      return new Zmanim(loc, now, false);
    })
  );

}
