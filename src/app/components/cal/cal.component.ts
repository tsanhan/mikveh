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
import { EventsService } from 'src/app/services/events.service';



import { addIcons } from 'ionicons';
import { add, chevronBackOutline, chevronForwardOutline, closeOutline } from 'ionicons/icons';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CachedInputEvent, CalEventDict, DayType, InputEventOna, InputEventType, OutputEvent } from 'src/app/interfaces/cal';
import { HDateToNgbDateStruct, hDateToHebrewDateKey, hebDateToHebrew, NgbDateStructToHDate } from 'src/app/utils/date.util';
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
  selectedNightDetails: WritableSignal<string[]> = signal([]);
  selectedDayDetails: WritableSignal<string[]> = signal([]);
  selectedOnah: WritableSignal<InputEventOna> = signal(InputEventOna.DAY);
  nowHDate = new HDate(new Date());
  selectedHebDate$ = new BehaviorSubject<NgbDateStruct>(HDateToNgbDateStruct(this.nowHDate));
  i18n = inject(NgbDatepickerI18n);
  calendar = inject(NgbCalendar);
  cal = inject(CalService);
  events = inject(EventsService);
  highlightedInputEvents$ = this.cal.highlightedInputEvents$.pipe(
    tap(val => {
      const selectedHebDate = this.selectedHebDate$.getValue();
      const {day,month,year} = selectedHebDate as NgbDateStruct;
      this.setSelectedDetails(val, selectedHebDate);
    })
  );
  public dayType = DayType;
  public inputEventOna = InputEventOna;
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
    map(([events, sel]: [CachedInputEvent[], NgbDateStruct]) => {
      const selectedDate = hDateToHebrewDateKey(NgbDateStructToHDate(sel));
      return events.filter(e =>
        e.hebrewDate.year === selectedDate.year &&
        e.hebrewDate.month === selectedDate.month &&
        e.hebrewDate.day === selectedDate.day);
    }),
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
    if (e.type === InputEventType.VESET || e.type === InputEventType.KETEM_TAME || e.type === InputEventType.BDIKA_TMEA) {
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
    firstValueFrom(this.events.hDateNow$).then(hdate => {
      this.nowHDate = hdate;
      this.selectedHebDate$.next(HDateToNgbDateStruct(hdate));
    });
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
    this.setSelectedDetails(highlightedInputEvents, event);
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

  isNidaDay(date: NgbDateStruct, calEventDict: CalEventDict): boolean {
    const { year, month, day } = date;
    const eventsForDay: OutputEvent[] = get(calEventDict, [year, month, day]) || [];
    const nidaTypes: Array<DayType | InputEventType> = [
      InputEventType.VESET,
      InputEventType.KETEM_TAME,
      InputEventType.BDIKA_TMEA,
      DayType.MAHZOR,
    ];
    return eventsForDay.some(event => nidaTypes.includes(event.outputEventType));
  }

  isEventForOna(
    date: NgbDateStruct,
    calEventDict: CalEventDict,
    type: DayType | InputEventType,
    ona: InputEventOna,
  ): boolean {
    const { year, month, day } = date;
    const hebrewDate = hDateToHebrewDateKey(NgbDateStructToHDate(date));
    const eventsForDay: OutputEvent[] = get(calEventDict,[year,month,day]) || [];
    return eventsForDay.some(event =>
      event.outputEventType === type && event.segments.some(segment =>
        segment.onah === ona &&
        segment.hebrewDate.year === hebrewDate.year &&
        segment.hebrewDate.month === hebrewDate.month &&
        segment.hebrewDate.day === hebrewDate.day,
      ),
    );
  }

  hasEventsForOnah(
    date: NgbDateStruct,
    calEventDict: CalEventDict,
    onah: InputEventOna,
  ): boolean {
    return this.eventsForOnah(date, calEventDict, onah).length > 0;
  }

  onotContainSameEvents(date: NgbDateStruct, calEventDict: CalEventDict): boolean {
    const nightEventIds = this.eventsForOnah(date, calEventDict, InputEventOna.NIGHT)
      .map(event => event.id)
      .sort();
    const dayEventIds = this.eventsForOnah(date, calEventDict, InputEventOna.DAY)
      .map(event => event.id)
      .sort();

    return nightEventIds.length > 0 &&
      nightEventIds.length === dayEventIds.length &&
      nightEventIds.every((id, index) => id === dayEventIds[index]);
  }

  onahClasses(
    date: NgbDateStruct,
    calEventDict: CalEventDict,
    ona: InputEventOna,
    fullDay = false,
  ) {
    return {
      'onah-area': true,
      'night': ona === InputEventOna.NIGHT,
      'day': ona === InputEventOna.DAY,
      'full-day': fullDay,
      'nidaDay': [InputEventType.VESET, InputEventType.KETEM_TAME, InputEventType.BDIKA_TMEA, DayType.MAHZOR]
        .some(type => this.isEventForOna(date, calEventDict, type, ona)),
      'veset': this.isEventForOna(date, calEventDict, InputEventType.VESET, ona),
      'ketemTame': this.isEventForOna(date, calEventDict, InputEventType.KETEM_TAME, ona),
      'bdikaTmea': this.isEventForOna(date, calEventDict, InputEventType.BDIKA_TMEA, ona),
      'canStartHefsek': this.isEventForOna(date, calEventDict, DayType.CAN_START_CHECK_HEFSEK, ona),
      'sevenCleans': this.isEventForOna(date, calEventDict, DayType.SEVEN_CLEAN, ona),
      'mikvehDay': this.isEventForOna(date, calEventDict, DayType.MIKVEH_DAY, ona),
      'onaBeinonit': this.isEventForOna(date, calEventDict, DayType.ONA_BEINONIT, ona),
      'vesetHachodesh':
        this.isEventForOna(date, calEventDict, DayType.VESET_HACHODESH_DAY, ona) ||
        this.isEventForOna(date, calEventDict, DayType.VESET_HACHODESH_NIGHT, ona),
      'haflaga':
        this.isEventForOna(date, calEventDict, DayType.HAFLAGA_DAY, ona) ||
        this.isEventForOna(date, calEventDict, DayType.HAFLAGA_NIGHT, ona),
    };
  }

  selectedOnahDetailsAreIdentical(): boolean {
    const nightDetails = [...this.selectedNightDetails()].sort();
    const dayDetails = [...this.selectedDayDetails()].sort();
    return nightDetails.length > 0 &&
      nightDetails.length === dayDetails.length &&
      nightDetails.every((detail, index) => detail === dayDetails[index]);
  }

  private setSelectedDetails(calEventDict: CalEventDict, date: NgbDateStruct) {
    const { year, month, day } = date;
    const events: OutputEvent[] = get(calEventDict, [year, month, day], []);
    this.selectedHebDateDetails.set(events.flatMap(event => event.details));
    this.selectedNightDetails.set(this.detailsForOnah(events, date, InputEventOna.NIGHT));
    this.selectedDayDetails.set(this.detailsForOnah(events, date, InputEventOna.DAY));
  }

  private detailsForOnah(events: OutputEvent[], date: NgbDateStruct, onah: InputEventOna): string[] {
    const hebrewDate = hDateToHebrewDateKey(NgbDateStructToHDate(date));
    return [...new Set(events
      .filter(event => event.segments.some(segment =>
        segment.onah === onah &&
        segment.hebrewDate.year === hebrewDate.year &&
        segment.hebrewDate.month === hebrewDate.month &&
        segment.hebrewDate.day === hebrewDate.day,
      ))
      .flatMap(event => event.details))];
  }

  private eventsForOnah(
    date: NgbDateStruct,
    calEventDict: CalEventDict,
    onah: InputEventOna,
  ): OutputEvent[] {
    const { year, month, day } = date;
    const hebrewDate = hDateToHebrewDateKey(NgbDateStructToHDate(date));
    const events: OutputEvent[] = get(calEventDict, [year, month, day], []);
    return events.filter(event => event.segments.some(segment =>
      segment.onah === onah &&
      segment.hebrewDate.year === hebrewDate.year &&
      segment.hebrewDate.month === hebrewDate.month &&
      segment.hebrewDate.day === hebrewDate.day,
    ));
  }


}
