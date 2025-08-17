import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
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
import { add } from 'ionicons/icons';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CalEvent, CalEventType, EventDto } from 'src/app/interfaces/cal';
import { ApproachService } from 'src/app/services/approach.service';
import { hebDateToHebrew, simpleDateToHebrew } from 'src/app/utils/date.util';

@Component({
  selector: 'app-cal',
  templateUrl: './cal.component.html',
  styleUrls: ['./cal.component.scss'],
  standalone: true,
  imports: [CommonModule,IonText, IonRadioGroup, IonRadio, ReactiveFormsModule, IonModal, IonContent, IonToolbar, IonTitle, IonList, IonItem, IonIcon, IonFabButton, IonFab, IonDatetime, AsyncPipe, DatePipe, JsonPipe, IonSelectOption, IonSelect, IonButton, IonLabel, NgIf],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalComponent {

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

  highlightedDates$ = this.cal.highlightedDates$;
  public CalEventTypeEnum = CalEventType;

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
    this.selectedDate$.pipe(tap(date => console.log('Selected date:', date))),
    this.approach$.pipe(tap(approach => console.log('Approach:', approach)))
  ]).pipe(
    switchMap(async ([highlightedDates, selectedDate, approach]) => {
      const dateTofind = selectedDate.toISOString().split('T')[0];
      const eventsOnThisDate = highlightedDates.filter(item => item.date === dateTofind);
      const filteredByApproach = eventsOnThisDate.filter(x => x.approach.name == approach.name);
      console.log(filteredByApproach);

      return filteredByApproach;
    })
  )
  addEventForm = new FormGroup({
    type: new FormControl<CalEventType>(CalEventType.SEE_BLOOD, { nonNullable: true, validators: [Validators.required] }),
    afterSunset: new FormControl<boolean>(false, { nonNullable: true, validators: [Validators.required] }),
  });
  // highlightedDatesFunc = this.cal.highlightedDatesFunc;
  constructor(private el: ElementRef) {
    addIcons({ add });
  }

  async onAddEvent() {
    console.log('onAddEvent:', this.addEventForm.value);
    const { type = CalEventType.SEE_BLOOD, afterSunset = false } = this.addEventForm.value;
    const date = this.selectedDate$.getValue();

    await this.cal.addEvent(type, date, afterSunset);
    this.addEventForm.reset();

  }

  async onDateChange(event: CustomEvent) {
    console.log('onDateChange:', event);
    const date = new Date(event.detail.value);
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

}

