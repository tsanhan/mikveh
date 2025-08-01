import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
} from '@angular/core';
import { IonDatetime, AlertController, AlertOptions, ModalController, IonButtons, IonButton, IonFab, IonFabButton, IonIcon, IonItem, IonAvatar, IonImg, IonLabel, IonList, IonTitle, IonToolbar, IonContent, IonModal, IonSelectOption, IonSelect, IonRadio, IonRadioGroup, IonText } from '@ionic/angular/standalone';
import { Zmanim, HebrewDateEvent, HDate } from '@hebcal/core';
import { EventsService } from 'src/app/services/events.service';
import { AsyncPipe, DatePipe, JsonPipe } from '@angular/common';
import '@hebcal/cities';
import {
  BehaviorSubject,
  combineLatest,
  combineLatestAll,
  lastValueFrom,
  map,
  switchMap,
} from 'rxjs';
import { CalService } from 'src/app/services/cal.service';
import { LocationService } from 'src/app/services/location.service';
import { CustomAlertComponent as AddCalEventCustomAlertComponent } from './custom-alert/custom-alert.component';



import { addIcons } from 'ionicons';
import { add } from 'ionicons/icons';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CalEvent, CalEventType } from 'src/app/interfaces/cal';

@Component({
  selector: 'app-cal',
  templateUrl: './cal.component.html',
  styleUrls: ['./cal.component.scss'],
  standalone: true,
  imports: [IonText, IonRadioGroup, IonRadio, ReactiveFormsModule, IonModal, IonContent, IonToolbar, IonTitle, IonList, IonItem, IonIcon, IonFabButton, IonFab, IonDatetime, AsyncPipe, DatePipe, JsonPipe, IonSelectOption, IonSelect, IonButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalComponent {

  events = inject(EventsService);
  cal = inject(CalService);
  loc = inject(LocationService);
  modalCtrl = inject(ModalController);
  fb = inject(FormBuilder)
  israelTime = this.events.localISOString(new Date());
  selectedDate$ = new BehaviorSubject<Date>(new Date());
  sunsetForDate$ = combineLatest([this.loc.closestCity$, this.selectedDate$]).pipe(
    map(([location, date]) => this.events.locationToSunsetTime(location, date))
  )
  selectedHDateHeb$ = this.selectedDate$.pipe(
    map((date: Date) => this.cal.simpleDateToHebrew(date)),
    map((date: HDate) => this.cal.hebDateToHebrew(date))
  );
  highlightedDates$ = this.cal.highlightedDates$;
  public CalEventTypeEnum = CalEventType;

  addEventForm = new FormGroup({
    type: new FormControl<CalEventType>(CalEventType.SEE_BLOOD, { nonNullable: true, validators: [Validators.required] }),
    afterSunset: new FormControl<boolean>(false, { nonNullable: true, validators: [Validators.required] }),
  });
  // highlightedDatesFunc = this.cal.highlightedDatesFunc;
  constructor(private el: ElementRef) {
    addIcons({ add });
  }

  onAddEvent() {
    console.log('onAddEvent:', this.addEventForm.value);
    const { type = CalEventType.SEE_BLOOD, afterSunset = false } = this.addEventForm.value;
    const date = this.selectedDate$.getValue();
    const hdate = this.cal.dateToHDate(date, afterSunset);
    const event:CalEvent = {
      type,
      hDateSunsetAwareString:hdate.toString(),
      afterSunset,
    };
    this.cal.addEvent(event);
    this.addEventForm.reset();

  }

  async onDateChange(event: CustomEvent) {
    console.log('onDateChange:', event);
    const date = new Date(event.detail.value);
    this.selectedDate$.next(date);
    // const hdate = new HDate(date);
   
    // const loc = this.loc.closestCity;
    // // let israelTime = this.events.localISOString(date);
    // const zmanAwware = this.cal.dateToHDate(date);

    // console.log('israelTime:', zmanAwware);
    // console.log('israelTime:', zmanAwware.render('he-x-NoNikud'));
    // console.log('israelTime:', this.cal.hebDateToHebrew(zmanAwware));
    // date.setHours(20); // success!!!
    // console.log('selectedDate:', date);
    // console.log('israelTime:', await this.dateToHebrew(date));

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
