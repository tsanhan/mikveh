import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  Signal,
  ViewChild,
} from '@angular/core';
import { IonDatetime, AlertOptions, ModalController, IonButton, IonFab, IonFabButton, IonIcon, IonItem, IonLabel, IonList, IonTitle, IonToolbar, IonContent, IonModal, IonSelectOption, IonSelect, IonRadio, IonRadioGroup, IonText } from '@ionic/angular/standalone';
import { HDate } from '@hebcal/core';
import { EventsService } from 'src/app/services/events.service';
import { AsyncPipe, CommonModule, DatePipe, JsonPipe, NgIf } from '@angular/common';
import '@hebcal/cities';
import {
  BehaviorSubject,
  combineLatest,
  firstValueFrom,
  lastValueFrom,
  map,
  Observable,
  of,
  share,
  switchMap,
  tap,
} from 'rxjs';
import { CalService } from 'src/app/services/cal.service';
import { LocationService } from 'src/app/services/location.service';



import { addIcons } from 'ionicons';
import { add, chevronBackOutline, chevronForwardOutline, closeOutline } from 'ionicons/icons';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CachedInputEvent, EventDto, InputEvent, InputEventType } from 'src/app/interfaces/cal';
import { ApproachService } from 'src/app/services/approach.service';
import { HDateToNgbDateStruct, hebDateToHebrew, NgbDateStructToHDate, simpleDateToHebrew } from 'src/app/utils/date.util';
import {
  NgbCalendar,
  NgbCalendarHebrew,
  NgbDate,
  NgbDatepicker,
  NgbDatepickerI18n,
  NgbDatepickerModule,
  NgbDateStruct,
} from '@ng-bootstrap/ng-bootstrap';

import * as colors from '../../../assets/data/colors.json';
import { CustomDatepickerI18n } from 'src/app/services/CustomDatepickerI18n.service';
import { CalAddEventComponent } from '../cal-add-event/cal-add-event.component';

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
  showEventModal = signal(false);
  nowHDate = new HDate(new Date());
  selectedHebDate$ = new BehaviorSubject<NgbDateStruct>(HDateToNgbDateStruct(this.nowHDate));
  i18n = inject(NgbDatepickerI18n);
  calendar = inject(NgbCalendar);
  cal = inject(CalService);
  highlightedInputEvents$ = this.cal.highlightedInputEvents$;

  @ViewChild('dt', { static: true }) dtRef!: any;
  selectedDate$ = new BehaviorSubject<Date>(new Date());

  selectedDateHDate$: Observable<HDate> = this.selectedHebDate$.pipe(
    map((heb: NgbDateStruct) => NgbDateStructToHDate(heb))
  )
  
  inputEvents$ = this.cal.inputEvents$;

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

  onDateSelect(event: any | NgbDateStruct) {
    console.trace('onDateSelect:', event);
    this.selectedHebDate$.next(event as NgbDateStruct);
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

  onCloseCalAddEvent(event: InputEvent | null) {
    this.cal.addEvent(event as InputEvent);
    this.showEventModal.set(false);
    
  }

  test(param1: NgbDateStruct, param2: CachedInputEvent) {
    console.log('test:', param1, param2);
  }
 
}

