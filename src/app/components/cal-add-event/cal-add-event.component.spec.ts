import { TestBed } from '@angular/core/testing';
import { HDate } from '@hebcal/core';
import { AlertController } from '@ionic/angular/standalone';
import { of } from 'rxjs';
import { InputEventOna, InputEventType } from 'src/app/interfaces/cal';
import { CalService } from 'src/app/services/cal.service';
import { EventsService } from 'src/app/services/events.service';
import { CalAddEventComponent } from './cal-add-event.component';

describe('CalAddEventComponent confirmation', () => {
  let component: CalAddEventComponent;
  let alertCtrl: jasmine.SpyObj<AlertController>;
  let dismiss: (result: { role: string }) => void;
  let emit: jasmine.Spy;
  let allowedCheckOnot: InputEventOna[];

  beforeEach(() => {
    allowedCheckOnot = [];
    const dismissed = new Promise<{ role: string }>(resolve => dismiss = resolve);
    alertCtrl = jasmine.createSpyObj('AlertController', ['create']);
    alertCtrl.create.and.resolveTo({
      present: async () => {},
      onDidDismiss: () => dismissed,
    } as HTMLIonAlertElement);
    TestBed.configureTestingModule({
      imports: [CalAddEventComponent],
      providers: [
        { provide: AlertController, useValue: alertCtrl },
        { provide: CalService, useValue: {
          canAddHefsekTahara: () => true,
          pureCheckOnot: () => allowedCheckOnot,
        } },
        { provide: EventsService, useValue: {
          sunriseByDate: () => of('06:00'),
          sunsetByDate: () => of('18:00'),
        } },
      ],
    });
    component = TestBed.runInInjectionContext(() => new CalAddEventComponent());
    component.hdate = new HDate(new Date(2026, 9, 6));
    component.selectedOna = InputEventOna.NIGHT;
    component.ngOnInit();
    emit = spyOn(component.closeAddEvent, 'emit');
  });

  it('explains the selected night from the preceding sunset to sunrise and where the next night belongs', async () => {
    const saving = component.addEvent();
    expect(emit).not.toHaveBeenCalled();
    const options = alertCtrl.create.calls.mostRecent().args[0]!;
    expect(options.message).toContain('עונת לילה');
    expect(options.message).toContain('6.10.2026');
    expect(options.message).toContain('כלומר, הראייה שלך היא בין יום שני אחרי השקיעה ליום שלישי עד הזריחה');
    expect(options.message).toContain('ראייה ביום שלישי אחרי השקיעה צריכה להירשם ביום רביעי, בעונת לילה');
    expect(options.buttons).toContain(jasmine.objectContaining({ text: 'כן, להוסיף' }));
    dismiss({ role: 'confirm' });
    await saving;
    expect(emit).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      type: InputEventType.VESET,
      ona: InputEventOna.NIGHT,
      simpleDate: new Date(2026, 9, 6),
    }));
    expect(component.isConfirming()).toBeFalse();
  });

  it('saves a day event without showing the night-onah confirmation', async () => {
    component.eventOnaFC.setValue(InputEventOna.DAY);
    await component.addEvent();
    expect(alertCtrl.create).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      ona: InputEventOna.DAY,
      simpleDate: new Date(2026, 9, 6),
    }));
  });

  for (const role of ['cancel', 'backdrop']) {
    it(`keeps the form and selections when dismissed with ${role}`, async () => {
      component.eventTypeFC.setValue(InputEventType.KETEM_TAME);
      const saving = component.addEvent();
      dismiss({ role });
      await saving;
      expect(emit).not.toHaveBeenCalled();
      expect(component.eventTypeFC.value).toBe(InputEventType.KETEM_TAME);
      expect(component.eventOnaFC.value).toBe(InputEventOna.NIGHT);
      expect(component.isConfirming()).toBeFalse();
    });
  }

  it('re-enables the rendered add button after returning for correction and allows another click', async () => {
    const fixture = TestBed.createComponent(CalAddEventComponent);
    fixture.componentRef.setInput('hdate', component.hdate);
    fixture.componentRef.setInput('selectedOna', InputEventOna.NIGHT);
    fixture.autoDetectChanges();
    const addButton = fixture.nativeElement.querySelector('.save-btn') as HTMLIonButtonElement;
    const addEvent = spyOn(fixture.componentInstance, 'addEvent').and.callThrough();
    const fixtureEmit = spyOn(fixture.componentInstance.closeAddEvent, 'emit');

    addButton.click();
    fixture.detectChanges();
    expect(addButton.disabled).toBeTrue();
    fixture.ngZone!.runOutsideAngular(() => dismiss({ role: 'cancel' }));
    await addEvent.calls.mostRecent().returnValue;
    await fixture.whenStable();

    expect(addButton.disabled).toBeFalse();
    expect(fixtureEmit).not.toHaveBeenCalled();

    fixture.componentInstance.eventOnaFC.setValue(InputEventOna.DAY);
    fixture.detectChanges();
    addButton.click();
    await addEvent.calls.mostRecent().returnValue;
    expect(addEvent).toHaveBeenCalledTimes(2);
    expect(fixtureEmit).toHaveBeenCalledOnceWith(jasmine.objectContaining({ ona: InputEventOna.DAY }));
  });

  it('opens one confirmation and emits once for repeated add clicks', async () => {
    const saving = component.addEvent();
    await component.addEvent();
    expect(alertCtrl.create).toHaveBeenCalledTimes(1);
    dismiss({ role: 'confirm' });
    await saving;
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it('saves Hefsek Tahara without asking about a hidden onah selection', async () => {
    component.eventTypeFC.setValue(InputEventType.HEFSEK_TAHARA);
    await component.addEvent();
    expect(alertCtrl.create).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      type: InputEventType.HEFSEK_TAHARA,
      ona: InputEventOna.DAY,
      simpleDate: new Date(2026, 9, 6),
    }));
  });

  it('shows the pure-check option only on concern dates and restricts the onah to the concern', () => {
    const fixture = TestBed.createComponent(CalAddEventComponent);
    fixture.componentRef.setInput('hdate', component.hdate);
    fixture.componentRef.setInput('selectedOna', InputEventOna.NIGHT);
    fixture.detectChanges();
    const radios = () => Array.from(fixture.nativeElement.querySelectorAll('ion-radio')) as HTMLIonRadioElement[];
    expect(radios().some(radio => radio.value === InputEventType.BDIKA_TEHORA)).toBeFalse();
    fixture.destroy();

    allowedCheckOnot = [InputEventOna.DAY];
    const concernFixture = TestBed.createComponent(CalAddEventComponent);
    concernFixture.componentRef.setInput('hdate', component.hdate);
    concernFixture.componentRef.setInput('selectedOna', InputEventOna.NIGHT);
    concernFixture.detectChanges();
    const pureRadio = Array.from(concernFixture.nativeElement.querySelectorAll('ion-radio'))
      .find((radio: any) => radio.value === InputEventType.BDIKA_TEHORA);
    expect(pureRadio).toBeDefined();
    concernFixture.componentInstance.eventTypeFC.setValue(InputEventType.BDIKA_TEHORA);
    concernFixture.detectChanges();
    expect(concernFixture.componentInstance.eventOnaFC.value).toBe(InputEventOna.DAY);
    const onahRadios = Array.from(concernFixture.nativeElement.querySelectorAll('ion-radio')) as HTMLIonRadioElement[];
    expect(onahRadios.find(radio => radio.value === InputEventOna.NIGHT)!.disabled).toBeTrue();
    expect(onahRadios.find(radio => radio.value === InputEventOna.DAY)!.disabled).toBeFalse();
    expect(concernFixture.nativeElement.textContent).toContain('בחרי את עונת הבדיקה');
    expect(concernFixture.nativeElement.querySelector('.save-btn').disabled).toBeFalse();
    concernFixture.componentInstance.eventTypeFC.setValue(InputEventType.VESET);
    concernFixture.detectChanges();
    expect(onahRadios.find(radio => radio.value === InputEventOna.NIGHT)!.disabled).toBeFalse();
  });

  it('saves a pure day check with its own event type and selected onah', async () => {
    allowedCheckOnot = [InputEventOna.DAY];
    component.pureCheckOnot = allowedCheckOnot;
    component.eventTypeFC.setValue(InputEventType.BDIKA_TEHORA);
    await component.addEvent();
    expect(alertCtrl.create).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      type: InputEventType.BDIKA_TEHORA,
      ona: InputEventOna.DAY,
    }));
  });

  for (const type of [InputEventType.BDIKA_TEHORA, InputEventType.BDIKA_TMEA]) {
    it(`saves a night ${type} directly without confirmation`, async () => {
      component.pureCheckOnot = [InputEventOna.NIGHT];
      component.eventTypeFC.setValue(type);
      await component.addEvent();
      expect(alertCtrl.create).not.toHaveBeenCalled();
      expect(emit).toHaveBeenCalledOnceWith(jasmine.objectContaining({
        type,
        ona: InputEventOna.NIGHT,
      }));
      expect(component.isConfirming()).toBeFalse();
    });
  }
});
