import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { IonButton, IonIcon, IonRadioGroup, IonRadio } from '@ionic/angular/standalone';
import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { heart, logoApple, pencilOutline, checkmarkOutline } from 'ionicons/icons';
import { provideIcons } from '@ng-icons/core';
import { featherEdit3 } from '@ng-icons/feather-icons';
import { CachedInputEvent, InputEventOna, InputEventType } from 'src/app/interfaces/cal';
import { HDate } from '@hebcal/core';
import { EventsService } from 'src/app/services/events.service';
import { AsyncPipe } from '@angular/common';
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { HDateToNgbDateStruct, hDateToHebrewDateKey } from 'src/app/utils/date.util';
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
  @Input() selectedOna: InputEventOna = InputEventOna.DAY;


  public InputEventTypeEnum = InputEventType;
  public InputEventOnaEnum = InputEventOna;

  eventTypeFC: FormControl = new FormControl<InputEventType>(InputEventType.VESET, { nonNullable: true });
  eventOnaFC: FormControl = new FormControl<InputEventOna>(InputEventOna.DAY, { nonNullable: true });

  
  events = inject(EventsService);
  cal = inject(CalService);
  sunriseByDate = (hdate: HDate) => this.events.sunriseByDate(hdate.greg() as Date);
  sunsetByDate = (hdate: HDate, onah: InputEventOna) => {
    const date = hdate.greg() as Date;
    if (onah === InputEventOna.NIGHT) {
      date.setDate(date.getDate() - 1);
    }
    return this.events.sunsetByDate(date);
  };

  // True when the woman has at least one prior sighting (Veset / Ketem / Bdika Tmea)
  // on or before the selected date – Hefsek Tahara is meaningless without one.
  canAddHefsek = false;

  constructor() { 
    addIcons({ logoApple, pencilOutline,heart, featherEdit3, checkmarkOutline  });
  }

  ngOnInit() {
    this.eventOnaFC.setValue(this.selectedOna);
    this.canAddHefsek = this.cal.canAddHefsekTahara(this.hdate.greg() as Date);
    if (!this.canAddHefsek && this.eventTypeFC.value === InputEventType.HEFSEK_TAHARA) {
      this.eventTypeFC.setValue(InputEventType.VESET);
    }
  }

  cancelAddEvent() {
    
    this.closeAddEvent.emit();
  }

  addEvent() {
    const ngbDateStruct = HDateToNgbDateStruct(this.hdate as HDate);
    const simpleDate = this.hdate.greg() as Date;
    const eventToEmit: CachedInputEvent = {
      id: globalThis.crypto?.randomUUID?.() ??
        `calendar-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      hebrewDate: hDateToHebrewDateKey(this.hdate),
      simpleDate,
      date: ngbDateStruct,
      type: this.eventTypeFC.value,
      ona: this.eventOnaFC.value,
    };
    this.closeAddEvent.emit(eventToEmit);
  }

}
