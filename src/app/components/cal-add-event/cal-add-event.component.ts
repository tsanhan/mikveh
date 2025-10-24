import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { IonButton, IonIcon, IonRadioGroup, IonRadio } from '@ionic/angular/standalone';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { heart, logoApple, pencilOutline, checkmarkOutline } from 'ionicons/icons';
import { provideIcons } from '@ng-icons/core';
import { featherEdit3 } from '@ng-icons/feather-icons';
import { InputEventOna, InputEventType, InputSpecificEventType } from 'src/app/interfaces/cal';
import { HDate } from '@hebcal/core';

@Component({
  selector: 'app-cal-add-event',
  templateUrl: './cal-add-event.component.html',
  styleUrls: ['./cal-add-event.component.scss'],
  imports: [IonRadio, IonRadioGroup,
    IonButton,
    IonIcon,
    ReactiveFormsModule],
  viewProviders: [provideIcons({ featherEdit3 })]
})
export class CalAddEventComponent  implements OnInit {
  @Output('onClose') closeAddEvent = new EventEmitter();
  @Input('hdate') hdate?: HDate | null;

  public InputEventTypeEnum = InputEventType;
  public InputSpecificEventTypeEnum = InputSpecificEventType;
  public InputEventOnaEnum = InputEventOna;

  eventTypeFC: FormControl = new FormControl<InputEventType>(InputEventType.REIYA, { nonNullable: true });
  eventSpecificTypeFC: FormControl = new FormControl<InputSpecificEventType>(InputSpecificEventType.VESET, { nonNullable: true });
  eventOnaFC: FormControl = new FormControl<InputEventOna>(InputEventOna.YOM, { nonNullable: true });

  constructor() { 
    addIcons({ logoApple, pencilOutline,heart, featherEdit3, checkmarkOutline  });
  }

  ngOnInit() {
    // this.eventTypeFC.valueChanges.subscribe(val => {
    //   console.log('Event type changed to: ', val);
    // });
  }

  cancelAddEvent() {
    this.closeAddEvent.emit();
  }

  addEvent() {
    this.closeAddEvent.emit();
  }

}
