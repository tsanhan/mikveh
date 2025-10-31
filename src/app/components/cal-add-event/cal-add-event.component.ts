import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { IonButton, IonIcon, IonRadioGroup, IonRadio } from '@ionic/angular/standalone';
import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { heart, logoApple, pencilOutline, checkmarkOutline } from 'ionicons/icons';
import { provideIcons } from '@ng-icons/core';
import { featherEdit3 } from '@ng-icons/feather-icons';
import { CachedInputEvent, InputEventOna, InputEventType, InputSpecificEventType } from 'src/app/interfaces/cal';
import { HDate } from '@hebcal/core';
import { EventsService } from 'src/app/services/events.service';
import { AsyncPipe } from '@angular/common';
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { HDateToNgbDateStruct, NgbDateStructToHDate } from 'src/app/utils/date.util';
import { CalService } from 'src/app/services/cal.service';

@Component({
  selector: 'app-cal-add-event',
  templateUrl: './cal-add-event.component.html',
  styleUrls: ['./cal-add-event.component.scss'],
  imports: [
    AsyncPipe,
    IonRadio, 
    IonRadioGroup,
    IonButton,
    IonIcon,
    ReactiveFormsModule],
  viewProviders: [provideIcons({ featherEdit3 })]
})
export class CalAddEventComponent  implements OnInit {
  @Output('onClose') closeAddEvent = new EventEmitter<CachedInputEvent |null>();
  @Input('hdate') hdate!: HDate;
  @Input('selectedHDateHeb') selectedHDateHeb?: string | null;


  public InputEventTypeEnum = InputEventType;
  public InputSpecificEventTypeEnum = InputSpecificEventType;
  public InputEventOnaEnum = InputEventOna;

  eventTypeFC: FormControl = new FormControl<InputEventType>(InputEventType.REIYA, { nonNullable: true });
  eventSpecificTypeFC: FormControl = new FormControl<InputSpecificEventType>(InputSpecificEventType.VESET, { nonNullable: true });
  eventOnaFC: FormControl = new FormControl<InputEventOna>(InputEventOna.YOM, { nonNullable: true });

  
  events = inject(EventsService);
  sunriseByDate = (hdate: HDate) => this.events.sunriseByDate(hdate.greg() as Date);
  sunsetByDate = (hdate: HDate) => this.events.sunsetByDate(hdate?.greg() as Date);



  constructor() { 
    addIcons({ logoApple, pencilOutline,heart, featherEdit3, checkmarkOutline  });
  }

  ngOnInit() {
   
  }

  cancelAddEvent() {
    
    this.closeAddEvent.emit();
  }

  addEvent() {
    const ngbDateStruct = HDateToNgbDateStruct(this.hdate as HDate);
    const simpleDate = this.hdate.greg() as Date;
    const eventToEmit: CachedInputEvent = {
      simpleDate,
      date: ngbDateStruct,
      type: this.eventTypeFC.value,
      ona: this.eventOnaFC.value,
      specificType: this.eventSpecificTypeFC.value,
    };
    this.closeAddEvent.emit(eventToEmit);
  }

}
