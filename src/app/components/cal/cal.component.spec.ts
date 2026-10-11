import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HDate } from '@hebcal/core';
import { AlertController } from '@ionic/angular/standalone';
import { NgbDatepicker } from '@ng-bootstrap/ng-bootstrap';
import { BehaviorSubject, of } from 'rxjs';
import { CachedInputEvent, CalEventDict, InputEventOna, InputEventType } from 'src/app/interfaces/cal';
import { CalService } from 'src/app/services/cal.service';
import { EventsService } from 'src/app/services/events.service';
import { hDateToHebrewDateKey, NgbDateStructToHDate } from 'src/app/utils/date.util';
import { CalComponent } from './cal.component';

describe('CalComponent month after marking', () => {
  let fixture: ComponentFixture<CalComponent>;
  let component: CalComponent;
  let cal: jasmine.SpyObj<CalService>;
  let alertCtrl: jasmine.SpyObj<AlertController>;

  const datepicker = () => fixture.debugElement.query(By.directive(NgbDatepicker)).componentInstance as NgbDatepicker;

  beforeEach(async () => {
    cal = jasmine.createSpyObj('CalService', ['addEvent', 'validateNewInputEvent', 'canAddHefsekTahara', 'pureCheckOnot'], {
      highlightedInputEvents$: new BehaviorSubject<CalEventDict>({}),
      inputEvents$: new BehaviorSubject<CachedInputEvent[]>([]),
    });
    cal.validateNewInputEvent.and.returnValue(null);
    cal.canAddHefsekTahara.and.returnValue(true);
    cal.pureCheckOnot.and.returnValue([InputEventOna.NIGHT, InputEventOna.DAY]);
    alertCtrl = jasmine.createSpyObj('AlertController', ['create']);
    alertCtrl.create.and.resolveTo({ present: async () => {} } as HTMLIonAlertElement);
    TestBed.configureTestingModule({
      imports: [CalComponent],
      providers: [
        { provide: CalService, useValue: cal },
        { provide: AlertController, useValue: alertCtrl },
        { provide: EventsService, useValue: {
          hDateNow$: of(new HDate()),
          sunriseByDate: () => of('06:00'),
          sunsetByDate: () => of('18:00'),
        } },
      ],
    });
    fixture = TestBed.createComponent(CalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  for (const offset of [-6, 6]) {
    for (const type of [InputEventType.VESET, InputEventType.KETEM_TAME, InputEventType.BDIKA_TMEA,
      InputEventType.BDIKA_TEHORA, InputEventType.HEFSEK_TAHARA]) {
      it(`keeps the month and selected day after saving ${type} ${offset} months from today`, async () => {
        const picker = datepicker();
        const target = picker.calendar.getNext(picker.calendar.getToday(), 'm', offset);
        picker.navigateTo(target);
        await component.onDateSelect(target);
        fixture.detectChanges();
        const selected = NgbDateStructToHDate(target);
        const event: CachedInputEvent = {
          id: 'test-mark',
          type,
          ona: InputEventOna.DAY,
          date: target,
          hebrewDate: hDateToHebrewDateKey(selected),
          simpleDate: selected.greg(),
        };

        component.showAddEvent();
        fixture.detectChanges();
        expect(fixture.debugElement.query(By.directive(NgbDatepicker))).toBeNull();
        await component.onCloseCalAddEvent(event);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(cal.addEvent).toHaveBeenCalledOnceWith(event);
        expect(datepicker().state.firstDate.year).toBe(target.year);
        expect(datepicker().state.firstDate.month).toBe(target.month);
        expect(component.selectedHebDate$.getValue()).toEqual(target);
      });
    }

    it(`keeps the browsed month on cancel even without changing the selected date (${offset})`, async () => {
      const picker = datepicker();
      const selected = component.selectedHebDate$.getValue();
      const target = picker.calendar.getNext(picker.calendar.getToday(), 'm', offset);
      picker.navigateTo(target);
      fixture.detectChanges();
      component.showAddEvent();
      fixture.detectChanges();
      await component.onCloseCalAddEvent(null);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(cal.addEvent).not.toHaveBeenCalled();
      expect(datepicker().state.firstDate.year).toBe(target.year);
      expect(datepicker().state.firstDate.month).toBe(target.month);
      expect(component.selectedHebDate$.getValue()).toEqual(selected);
    });
  }
});
