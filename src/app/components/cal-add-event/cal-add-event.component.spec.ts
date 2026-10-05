import { TestBed } from '@angular/core/testing';
import { HDate } from '@hebcal/core';
import { AlertController } from '@ionic/angular/standalone';
import { InputEventOna, InputEventType } from 'src/app/interfaces/cal';
import { CalService } from 'src/app/services/cal.service';
import { EventsService } from 'src/app/services/events.service';
import { CalAddEventComponent } from './cal-add-event.component';

describe('CalAddEventComponent confirmation', () => {
  let component: CalAddEventComponent;
  let alertCtrl: jasmine.SpyObj<AlertController>;
  let dismiss: (result: { role: string }) => void;
  let emit: jasmine.Spy;

  beforeEach(() => {
    const dismissed = new Promise<{ role: string }>(resolve => dismiss = resolve);
    alertCtrl = jasmine.createSpyObj('AlertController', ['create']);
    alertCtrl.create.and.resolveTo({
      present: async () => {},
      onDidDismiss: () => dismissed,
    } as HTMLIonAlertElement);
    TestBed.configureTestingModule({
      providers: [
        { provide: AlertController, useValue: alertCtrl },
        { provide: CalService, useValue: { canAddHefsekTahara: () => true } },
        { provide: EventsService, useValue: {} },
      ],
    });
    component = TestBed.runInInjectionContext(() => new CalAddEventComponent());
    component.hdate = new HDate(new Date(2026, 9, 6));
    component.selectedOna = InputEventOna.NIGHT;
    component.ngOnInit();
    emit = spyOn(component.closeAddEvent, 'emit');
  });

  it('confirms a night event using the selected weekday and the following weekday', async () => {
    const saving = component.addEvent();
    expect(emit).not.toHaveBeenCalled();
    const options = alertCtrl.create.calls.mostRecent().args[0]!;
    expect(options.message).toContain('עונת לילה');
    expect(options.message).toContain('6.10.2026');
    expect(options.message).toContain('ראייה ביום שלישי אחרי השקיעה צריכה להירשם ביום רביעי, בעונת לילה');
    expect(options.buttons).toContain(jasmine.objectContaining({ text: 'כן, להוסיף' }));
    dismiss({ role: 'confirm' });
    await saving;
    expect(emit).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      type: InputEventType.VESET,
      ona: InputEventOna.NIGHT,
      simpleDate: new Date(2026, 9, 6),
    }));
    expect(component.isConfirming).toBeFalse();
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
      component.eventTypeFC.setValue(InputEventType.BDIKA_TMEA);
      const saving = component.addEvent();
      dismiss({ role });
      await saving;
      expect(emit).not.toHaveBeenCalled();
      expect(component.eventTypeFC.value).toBe(InputEventType.BDIKA_TMEA);
      expect(component.eventOnaFC.value).toBe(InputEventOna.NIGHT);
      expect(component.isConfirming).toBeFalse();
    });
  }

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
    }));
  });
});
