import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { IonDatetime } from '@ionic/angular/standalone';
import { Zmanim , Locale, Location, HebrewDateEvent} from '@hebcal/core';
import { EventsService } from 'src/app/services/events.service';
import { AsyncPipe, DatePipe } from '@angular/common';
import '@hebcal/cities';
import { BehaviorSubject } from 'rxjs';
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
  israelTime = this.events.localISOString(new Date());
  selectedDateData = new BehaviorSubject<string>(this.dateToHebrew(new Date()));
  constructor() {}

  onDateChange(event: CustomEvent) {
    console.log('onDateChange:', event);
    const date = new Date(event.detail.value);
    // const loc = Location.lookup('Jerusalem') as Location;
    // // let israelTime = this.events.localISOString(date);
    // const zmanAwware = Zmanim.makeSunsetAwareHDate(loc, date, true);

    // console.log('israelTime:', zmanAwware);
    //     console.log('israelTime:', zmanAwware.render('he-x-NoNikud'));
    //     const as = new HebrewDateEvent(zmanAwware);
    //     console.log('israelTime:', as.render('he-x-NoNikud'));
    date.setHours(20) // success!!!
    console.log('selectedDate:', date);
    console.log('israelTime:', this.dateToHebrew(date));
    const test = "2025-06-15T19:30:22.733"
    const dateTest = new Date(test);
    console.log('israelTimeTest:', this.dateToHebrew(dateTest));


  }

  dateToHebrew(date: Date): string {
    const loc = Location.lookup('Jerusalem') as Location;
    const zmanAwware = Zmanim.makeSunsetAwareHDate(loc, date, true);
    const as = new HebrewDateEvent(zmanAwware);
    return as.render('he-x-NoNikud');
  }


}
