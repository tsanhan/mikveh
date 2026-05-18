import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Signal,
  signal,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import { AlertController, IonButton, IonIcon } from '@ionic/angular/standalone';
import { HDate } from '@hebcal/core';
import { CommonModule } from '@angular/common';
import '@hebcal/cities';
import {
  BehaviorSubject,
  combineLatest,
  firstValueFrom,
  map,
  Observable,
  tap,
} from 'rxjs';
import { CalService } from 'src/app/services/cal.service';



import { addIcons } from 'ionicons';
import { add, chevronBackOutline, chevronForwardOutline, closeOutline } from 'ionicons/icons';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CachedInputEvent, CalEventDict, DayType, InputEventType, OutputEvent } from 'src/app/interfaces/cal';
import { HDateToNgbDateStruct, hebDateToHebrew, NgbDateStructToHDate } from 'src/app/utils/date.util';
import {
  NgbCalendar,
  NgbCalendarHebrew,
  NgbDate,
  NgbDatepicker,
  NgbDatepickerI18n,
  NgbDatepickerModule,
  NgbDateStruct,
} from '@ng-bootstrap/ng-bootstrap';

import { CustomDatepickerI18n } from 'src/app/services/CustomDatepickerI18n.service';
import { CalAddEventComponent } from '../cal-add-event/cal-add-event.component';
import { get } from 'lodash';

@Component({
  selector: 'app-cal',
  templateUrl: './cal.component.html',
  styleUrls: ['./cal.component.scss'],
  imports: [CommonModule,
    ReactiveFormsModule,
    IonIcon,
    NgbDatepickerModule,
    FormsModule,
    IonButton,
    CalAddEventComponent
  ],
  providers: [
    { provide: NgbCalendar, useClass: NgbCalendarHebrew },
    { provide: NgbDatepickerI18n, useClass: CustomDatepickerI18n },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalComponent  {
  showEventModal:WritableSignal<boolean> = signal(false);
  selectedHebDateDetails: WritableSignal<string[]> = signal([]);
  nowHDate = new HDate(new Date());
  selectedHebDate$ = new BehaviorSubject<NgbDateStruct>(HDateToNgbDateStruct(this.nowHDate));
  i18n = inject(NgbDatepickerI18n);
  calendar = inject(NgbCalendar);
  cal = inject(CalService);
  highlightedInputEvents$ = this.cal.highlightedInputEvents$.pipe(
    tap(val => {
      const selectedHebDate = this.selectedHebDate$.getValue();
      const {day,month,year} = selectedHebDate as NgbDateStruct;
      const events =  get(val, [year,month,day],[]).map((e:OutputEvent) => e.details).flat();
      this.selectedHebDateDetails.set(events);
    })
  );
  public dayType = DayType;
  public inputEventType = InputEventType;

  @ViewChild('dt', { static: true }) dtRef!: any;
  selectedDate$ = new BehaviorSubject<Date>(new Date());

  selectedDateHDate$: Observable<HDate> = this.selectedHebDate$.pipe(
    map((heb: NgbDateStruct) => NgbDateStructToHDate(heb))
  )

  inputEvents$ = this.cal.inputEvents$;

  // Input events that fall on the currently selected calendar day.
  selectedDayInputEvents$: Observable<CachedInputEvent[]> = combineLatest([
    this.inputEvents$,
    this.selectedHebDate$,
  ]).pipe(
    map(([events, sel]: [CachedInputEvent[], NgbDateStruct]) =>
      events.filter(e =>
        e.date.year === sel.year &&
        e.date.month === sel.month &&
        e.date.day === sel.day),
    ),
  );

  inputEventTypeLabels: Record<string, string> = {
    [InputEventType.VESET]: 'ווסת',
    [InputEventType.KETEM_TAME]: 'כתם טמא',
    [InputEventType.BDIKA_TMEA]: 'בדיקה טמאה',
    [InputEventType.HEFSEK_TAHARA]: 'הפסק טהרה',
    [InputEventType.REIYA]: 'ראיה',
  };

  inputEventLabel(e: CachedInputEvent): string {
    const base = this.inputEventTypeLabels[e.type] ?? e.type;
    if (e.type === InputEventType.VESET || e.type === InputEventType.KETEM_TAME) {
      const ona = e.ona === 'layla' ? 'לילה' : 'יום';
      return `${base} (${ona})`;
    }
    return base;
  }

  selectedHDateHeb$: Observable<string> = this.selectedDateHDate$.pipe(
    map((date: HDate) => hebDateToHebrew(date))
  );

  selectedGregDate$: Observable<string> = this.selectedDateHDate$.pipe(
    map((date: HDate) => date.greg()),
    // map tp format dd.mm.yyyy
    map((date: Date) => {
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      return `${day.toString().padStart(2, '0')}.${month.toString().padStart(2, '0')}.${year}`;
    }
    )
  );


  constructor(private el: ElementRef) {
    addIcons({ add, closeOutline, chevronBackOutline, chevronForwardOutline });
    this.dayTemplateData = this.dayTemplateData.bind(this);
  }

  public dayTemplateData(date: NgbDateStruct) {
    return {
      gregorian: (this.calendar as NgbCalendarHebrew).toGregorian(date as NgbDate),
    };
  }

  async onDateSelect(event: any | NgbDateStruct) {
    console.log('onDateSelect:', event);
    const highlightedInputEvents:CalEventDict = await firstValueFrom(this.highlightedInputEvents$);
    const {day,month,year} = event as NgbDateStruct;
    const events = get(highlightedInputEvents,[year,month,day], []).map((e:OutputEvent) => e.details).flat();
    this.selectedHebDate$.next(event);
    this.selectedHebDateDetails.set(events);
  };

  showAddEvent() {
    this.showEventModal.set(true)
  }

  navigate(datepicker: NgbDatepicker, number: number) {
    const { state, calendar } = datepicker;
    datepicker.navigateTo(calendar.getNext(state.firstDate, 'm', number));
  }

  today(datepicker: NgbDatepicker) {
    const { calendar } = datepicker;
    datepicker.navigateTo(calendar.getToday());
  }

  async onDateChange(event: CustomEvent) {
    console.log('onDateChange:', event);
    const date = new Date(event.detail.value.split('T')[0] + 'T12:00:00'); // noon to avoid timezone issues
    this.selectedDate$.next(date);
  }

  private alertCtrl = inject(AlertController);

  async onCloseCalAddEvent(event: CachedInputEvent | null) {
    if (event) {
      const error = this.cal.validateNewInputEvent(event);
      if (error) {
        const alert = await this.alertCtrl.create({
          header: 'שגיאה',
          message: error,
          buttons: ['סגור'],
        });
        await alert.present();
        return;
      }
      this.cal.addEvent(event);
    }
    this.showEventModal.set(false);
  }

  async onRemoveInputEvent(event: CachedInputEvent) {
    const alert = await this.alertCtrl.create({
      header: 'מחיקת אירוע',
      message: `למחוק את האירוע "${this.inputEventLabel(event)}"?`,
      buttons: [
        { text: 'ביטול', role: 'cancel' },
        {
          text: 'מחק',
          role: 'destructive',
          handler: () => this.cal.removeEvent(event),
        },
      ],
    });
    await alert.present();
  }

  // isNidaDay(date: NgbDateStruct, calEventDict: CalEventDict) {
  //   const { year, month, day } = date;
  //   const eventsForDay = get(calEventDict,[year,month,day]) || [];
  //   if(eventsForDay.length)
  //     if(eventsForDay.some(e => [DayType.VESET, DayType.MAHZOR].includes(e.outputEventType)))
  //       return 'nida-day';
  //   return 'standard-day';
  //   return '';
  //   // return eventsForDay.some(event => event.type === InputEventType.SEE_BLOOD);
  // }

  isADay(date: NgbDateStruct, calEventDict: CalEventDict, typeToCompare: DayType | InputEventType) {
    const { year, month, day } = date;
    const eventsForDay = get(calEventDict,[year,month,day]) || [];
    return eventsForDay.length && eventsForDay.some(e => e.outputEventType == typeToCompare);
  }


}

