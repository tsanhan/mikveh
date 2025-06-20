import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnInit,
} from '@angular/core';
import { IonDatetime } from '@ionic/angular/standalone';
import {
  Zmanim,
  Locale,
  Location,
  HebrewDateEvent,
  HDate,
  HebrewCalendar,
} from '@hebcal/core';
import { EventsService } from 'src/app/services/events.service';
import { AsyncPipe, DatePipe } from '@angular/common';
import '@hebcal/cities';
import { BehaviorSubject, combineLatest, lastValueFrom, map } from 'rxjs';
import { CalService } from 'src/app/services/cal.service';
import { LocationService } from 'src/app/services/location.service';
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
  cal = inject(CalService);
  loc = inject(LocationService);
  israelTime = this.events.localISOString(new Date());
  selectedDate$ = new BehaviorSubject<string>(this.israelTime);
  highlightedDates$ = this.cal.highlightedDates$;
  selectedDateData$ = combineLatest([this.cal.dates$, this.selectedDate$]).pipe(
    map(async ([dates, selectedDate]) => {
      const localISOString = this.events.localISOString(new Date(selectedDate));
      const dateToHebrew = await this.dateToHebrew(new Date(selectedDate));
      return dates[selectedDate] || null;
    })
  );

  // highlightedDatesFunc = this.cal.highlightedDatesFunc;
  constructor(private el: ElementRef) {}

  onDateChange(event: CustomEvent) {
    console.log('onDateChange:', event);
    const date = new Date(event.detail.value);
    this.selectedDate$.next(this.events.localISOString(date));

    // const date = new Date(event.detail.value);
    // this.cal.addHighlightedDate(
    //   date,
    //   '#800080',
    //   '#ffc0cb'
    // )
    // const loc = Location.lookup('Jerusalem') as Location;
    // // let israelTime = this.events.localISOString(date);
    // const zmanAwware = Zmanim.makeSunsetAwareHDate(loc, date, true);

    // console.log('israelTime:', zmanAwware);
    //     console.log('israelTime:', zmanAwware.render('he-x-NoNikud'));
    //     const as = new HebrewDateEvent(zmanAwware);
    //     console.log('israelTime:', as.render('he-x-NoNikud'));
    date.setHours(20); // success!!!
    console.log('selectedDate:', date);
    console.log('israelTime:', this.dateToHebrew(date));

    // const dt = this.el.nativeElement.querySelector('ion-datetime');
    // const shadow = dt?.shadowRoot;
    // if (shadow) {
    //   const btn = shadow.querySelector(
    //     'button.calendar-day[data-day="17"][data-month="6"][data-year="2025"]'
    //   );
    //   btn?.setAttribute(
    //     'style',
    //     'background: linear-gradient(135deg, #a6c0fe, #f68084) !important; color: white !important;'
    //   );
    // }
  }

  async dateToHebrew(date: Date): Promise<string> {
    return lastValueFrom(this.loc.closestCity$).then((loc) => {
      const zmanAwware = Zmanim.makeSunsetAwareHDate(loc, date, true);
      const as = new HebrewDateEvent(zmanAwware);
      return as.render('he-x-NoNikud');
    });
  }

  async hebrewDateToDate(hebrewDate: string): Promise<Date> {
    return lastValueFrom(this.loc.closestCity$).then((loc) => {
      const hDate = HDate.fromGematriyaString(hebrewDate);
      const zmanAwware = Zmanim.makeSunsetAwareHDate(loc, hDate.greg(), true);
      return zmanAwware.greg();
    });
  }
}
