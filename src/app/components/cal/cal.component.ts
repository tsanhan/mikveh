import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnDestroy,
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
import { add, closeOutline } from 'ionicons/icons';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { EventDto, InputEventType } from 'src/app/interfaces/cal';
import { ApproachService } from 'src/app/services/approach.service';
import { hebDateToHebrew, simpleDateToHebrew } from 'src/app/utils/date.util';
import {
  NgbCalendar,
  NgbCalendarHebrew,
  NgbDate,
  NgbDatepickerI18n,
  NgbDatepickerI18nHebrew,
  NgbDatepickerModule,
  NgbDateStruct,
} from '@ng-bootstrap/ng-bootstrap';

import * as colors from '../../../assets/data/colors.json';

@Component({
  selector: 'app-cal',
  templateUrl: './cal.component.html',
  styleUrls: ['./cal.component.scss'],
  imports: [CommonModule,
    // IonText,
    // IonRadioGroup,
    // IonRadio,
    ReactiveFormsModule,
    // IonModal,
    // IonContent,
    // IonToolbar,
    // IonTitle,
    // IonList,
    // IonItem,
    // IonIcon,
    // IonFabButton,
    // IonFab,
    // AsyncPipe,
    // DatePipe,
    NgbDatepickerModule,
    FormsModule,
    // IonSelectOption, 
    // IonSelect,
    //  IonButton
    ],
  providers: [
    { provide: NgbCalendar, useClass: NgbCalendarHebrew },
    { provide: NgbDatepickerI18n, useClass: NgbDatepickerI18nHebrew },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalComponent implements OnDestroy {
  model: NgbDateStruct;
  i18n = inject(NgbDatepickerI18n);
  calendar = inject(NgbCalendar);
  date: { year: number; month: number };

  @ViewChild('dt', { static: true }) dtRef!: any;
  private mo?: MutationObserver;

  events = inject(EventsService);
  cal = inject(CalService);
  loc = inject(LocationService);
  modalCtrl = inject(ModalController);
  approach = inject(ApproachService);

  fb = inject(FormBuilder)
  israelTime = this.events.localISOString(new Date());
  approach$ = this.approach.approach$.pipe(share());
  selectedDate$ = new BehaviorSubject<Date>(new Date());

  sunsetForDate$ = combineLatest([this.loc.closestCity$, this.selectedDate$]).pipe(
    map(([location, date]) => this.events.locationToSunsetTime(location, date))
  )

  selectedHDateHeb$: Observable<string> = this.selectedDate$.pipe(
    map((date: Date) => simpleDateToHebrew(date)),
    map((date: HDate) => hebDateToHebrew(date))
  );

  highlightedDates$ = this.cal.highlightedDates$.pipe(
    map((events: EventDto[]) => events.map((event: EventDto) =>
    ({
      ...event,
      backgroundColor: (colors as any)[event.type] || 'transparent',
    })
    ))
  );
  public InputEventTypeEnum = InputEventType;
  // detailsToList$ = this.highlightedDates$.pipe(
  //   map((highlightedDates: EventDto[]) => {
  //     const selectedDate = this.selectedDate$.getValue();
  //     const dateTofind = selectedDate.toISOString().split('T')[0];
  //     return { highlightedDates, dateTofind };
  //   }),
  //   switchMap(({ highlightedDates, dateTofind }) => {
  //     const eventsOnThisDate = highlightedDates.filter(item => item.date === dateTofind);
  //     const approach = this.approach.approach$.getValue();
  //     const filteredByApproach = eventsOnThisDate.filter(x => x.approach.name == approach.name);
  //     return of(filteredByApproach);
  //   })
  // )

  detailsToList$ = combineLatest([
    this.highlightedDates$.pipe(tap(highlightedDates => console.log('Highlighted Dates:', highlightedDates))),
    this.selectedDate$.pipe(tap(date => console.log('Selected date:', date)))
  ]).pipe(
    switchMap(async ([highlightedDates, selectedDate]) => {
      const dateTofind = selectedDate.toISOString().split('T')[0];
      const eventsOnThisDate = highlightedDates.filter(item => item.date === dateTofind);
      console.log(eventsOnThisDate);

      return eventsOnThisDate;
    })
  )
  addEventForm = new FormGroup({
    type: new FormControl<InputEventType>(InputEventType.SEE_BLOOD, { nonNullable: true, validators: [Validators.required] }),
    afterSunset: new FormControl<boolean>(false, { nonNullable: true, validators: [Validators.required] }),
  });
  // highlightedDatesFunc = this.cal.highlightedDatesFunc;
  constructor(private el: ElementRef) {
    addIcons({ add, closeOutline });
    this.dayTemplateData = this.dayTemplateData.bind(this);


  }
  public dayTemplateData(date: NgbDateStruct) {
    return {
      gregorian: (this.calendar as NgbCalendarHebrew).toGregorian(date as NgbDate),
    };
  }
  // ngAfterViewInit() {
  //   setTimeout(() => {
  //     this.applyBoldToRedDays();
  //     const root = this.dtRef.elementRef.nativeElement.shadowRoot;
  //     if (root) {
  //       let lastElState = {};
  //       this.mo = new MutationObserver((el: any) => {
  //         if (JSON.stringify(lastElState) != JSON.stringify(el)) {
  //           lastElState = el;
  //           this.applyBoldToRedDays()
  //         }
  //       });
  //       this.mo.observe(root, { childList: true, subtree: true, attributes: true });
  //     }
  //   }, 0);
  // }
  // applyBoldToRedDays() {
  //   const root = this.dtRef.elementRef.nativeElement.shadowRoot as ShadowRoot;
  //   if (!root) return;

  //   root.querySelectorAll<HTMLButtonElement>('button.calendar-day ion-icon').forEach(icon => icon.remove());
  //   const days =root.querySelectorAll<HTMLButtonElement>('button.calendar-day')
  //   days.forEach(btn => {
  //     const backgroundColor = window.getComputedStyle(btn).backgroundColor;
  //     const className = (colors as any)[backgroundColor];
  //     if(className) {
  //       //create an element with that class name to get the color
  //       const iconEl = document.createElement('ion-icon');
  //       iconEl.setAttribute('slot', 'icon-only');
  //       iconEl.setAttribute('name', 'close-outline');

  //       iconEl.style.position = 'absolute';
  //       iconEl.style.top = '-4px';
  //       iconEl.style.left = '-3px';
  //       iconEl.style.background = backgroundColor
  //       iconEl.style.borderRadius = '50%';
  //       iconEl.style.padding = '2px';

  //       iconEl.classList.add(className);
  //       btn.appendChild(iconEl);
  //     }

  //   });
  // }
  async onAddEvent() {
    console.log('onAddEvent:', this.addEventForm.value);
    const date = this.selectedDate$.getValue();
    const { type, afterSunset } = this.addEventForm.getRawValue();
    // get current value from detailsToList$ 
    const data = await firstValueFrom(this.detailsToList$);
    console.log('Current detailsToList$ data:', data);
    await this.cal.addEvent(date, type, afterSunset);
    this.addEventForm.reset();

  }

  async onDateChange(event: CustomEvent) {
    console.log('onDateChange:', event);
    const date = new Date(event.detail.value.split('T')[0] + 'T12:00:00'); // noon to avoid timezone issues
    this.selectedDate$.next(date);

  }


  async openAddEventModal() {

  }

  generateAlertOptions(): AlertOptions {
    return {
      header: 'Custom Alert',
      subHeader: 'This is a custom alert with aria attributes.',
      message: 'This alert has custom aria attributes for accessibility.',
      inputs: [
        {
          type: 'date',
          name: 'dateInput',
          placeholder: 'Select a date',
          value: this.selectedDate$.getValue(),
          attributes: {
            'aria-label': 'Select a date',
            'aria-required': 'true',
          },
        },
      ],
      buttons: ['OK'],
      cssClass: 'custom-alert',
      backdropDismiss: true,
      keyboardClose: true,
      animated: true,
    };
  }
  ngOnDestroy() {
    this.mo?.disconnect();
  }
}

