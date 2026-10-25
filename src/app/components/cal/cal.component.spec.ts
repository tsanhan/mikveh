import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HDate } from '@hebcal/core';
import { AlertController } from '@ionic/angular/standalone';
import { NgbDatepicker } from '@ng-bootstrap/ng-bootstrap';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { CachedInputEvent, CalEventDict, DayType, InputEventOna, InputEventType, OutputEvent } from 'src/app/interfaces/cal';
import { CalService } from 'src/app/services/cal.service';
import { EventsService } from 'src/app/services/events.service';
import { hDateToHebrewDateKey, HDateToNgbDateStruct, NgbDateStructToHDate } from 'src/app/utils/date.util';
import { CalendarNavigationService } from '../../services/calendar-navigation.service';
import { CalComponent } from './cal.component';
import { CalAddEventComponent } from '../cal-add-event/cal-add-event.component';

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

  for (const onah of [InputEventOna.DAY, InputEventOna.NIGHT]) {
    it(`opens a notification's month/day/${onah} even while the input form is open`, async () => {
      const hdate = new HDate().add(6, 'M');
      const date = HDateToNgbDateStruct(hdate);
      component.showAddEvent();
      fixture.detectChanges();
      TestBed.inject(CalendarNavigationService).open({ hebrewDate: hDateToHebrewDateKey(hdate), onah });
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(component.showEventModal()).toBeTrue();
      expect(component.selectedHebDate$.value).toEqual(date);
      expect(component.selectedOnah()).toBe(onah);
      const editor = fixture.debugElement.query(By.directive(CalAddEventComponent)).componentInstance as CalAddEventComponent;
      expect(editor.hdate.abs()).toBe(hdate.abs());
      expect(editor.eventOnaFC.value).toBe(onah);
      expect(fixture.nativeElement.querySelector('.selected-date').textContent).toBe(editor.selectedHDateHeb);
      expect(cal.addEvent).not.toHaveBeenCalled();
      await component.onCloseCalAddEvent(null);
      fixture.detectChanges();
      expect(datepicker().state.firstDate.year).toBe(date.year);
      expect(datepicker().state.firstDate.month).toBe(date.month);
    });
  }

  it('retains a cold-start target until the calendar mounts and ignores a late today value', async () => {
    const navigation = TestBed.inject(CalendarNavigationService);
    fixture.destroy();
    const today = new Subject<HDate>();
    TestBed.inject(EventsService).hDateNow$ = today;
    const hdate = new HDate().add(-6, 'M');
    navigation.open({ hebrewDate: hDateToHebrewDateKey(hdate), onah: InputEventOna.NIGHT });
    fixture = TestBed.createComponent(CalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    today.next(new HDate());
    await fixture.whenStable();
    fixture.detectChanges();
    const target = HDateToNgbDateStruct(hdate);
    expect(component.selectedHebDate$.value).toEqual(target);
    expect(component.selectedOnah()).toBe(InputEventOna.NIGHT);
    expect(component.showEventModal()).toBeTrue();
    const editor = fixture.debugElement.query(By.directive(CalAddEventComponent)).componentInstance as CalAddEventComponent;
    expect(editor.hdate.abs()).toBe(hdate.abs());
    expect(editor.eventOnaFC.value).toBe(InputEventOna.NIGHT);
    let retained: unknown = 'unset';
    const subscription = navigation.requests$.subscribe(value => retained = value);
    expect(retained).toBeNull();
    subscription.unsubscribe();
  });

  it('displays the actual event details on the selected notification date', async () => {
    const hdate = new HDate().add(1, 'M');
    const date = HDateToNgbDateStruct(hdate);
    const hebrewDate = hDateToHebrewDateKey(hdate);
    const source: CachedInputEvent = {
      id: 'hefsek', type: InputEventType.HEFSEK_TAHARA, ona: InputEventOna.DAY,
      hebrewDate, simpleDate: hdate.greg(), date,
    };
    const event: OutputEvent = {
      id: 'mikveh', outputEventType: DayType.MIKVEH_DAY,
      segments: [{ hebrewDate, onah: InputEventOna.NIGHT }],
      details: ['בערב טבילה במקווה'], CachedInputEventRef: source,
      simpleDate: hdate.greg(), date,
    };
    (cal.highlightedInputEvents$ as BehaviorSubject<CalEventDict>).next({
      [date.year]: { [date.month]: { [date.day]: [event] } },
    });
    TestBed.inject(CalendarNavigationService).open({ hebrewDate, onah: InputEventOna.NIGHT });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.selectedNightDetails()).toEqual(['בערב טבילה במקווה']);
    expect(component.selectedDayDetails()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('בערב טבילה במקווה');
  });

  it('shows the correct month name when a notification opens Nisan of a leap year', async () => {
    const hdate = new HDate(10, 1, 5787);
    TestBed.inject(CalendarNavigationService).open({
      hebrewDate: hDateToHebrewDateKey(hdate), onah: InputEventOna.NIGHT,
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.showEventModal()).toBeTrue();
    await component.onCloseCalAddEvent(null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.nav .text-dark').textContent).toContain('ניסן');
    expect(component.selectedHebDate$.value).toEqual(HDateToNgbDateStruct(hdate));
  });

  it('resets the editor when a second notification targets another day and onah', async () => {
    const navigation = TestBed.inject(CalendarNavigationService);
    const first = new HDate(10, 9, 5787);
    navigation.open({ hebrewDate: hDateToHebrewDateKey(first), onah: InputEventOna.DAY });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const firstEditor = fixture.debugElement.query(By.directive(CalAddEventComponent)).componentInstance as CalAddEventComponent;
    firstEditor.eventTypeFC.setValue(InputEventType.KETEM_TAME);
    const second = first.add(1, 'd');
    navigation.open({ hebrewDate: hDateToHebrewDateKey(second), onah: InputEventOna.NIGHT });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const secondEditor = fixture.debugElement.query(By.directive(CalAddEventComponent)).componentInstance as CalAddEventComponent;
    expect(secondEditor).not.toBe(firstEditor);
    expect(secondEditor.hdate.abs()).toBe(second.abs());
    expect(secondEditor.eventOnaFC.value).toBe(InputEventOna.NIGHT);
    expect(secondEditor.eventTypeFC.value).toBe(InputEventType.VESET);
    expect(cal.addEvent).not.toHaveBeenCalled();
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
