import { CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { CalendarNotificationsService } from '../../services/calendar-notifications.service';
import { SideMenuContentComponent } from './side-menu-content.component';
import { CalComponent } from '../cal/cal.component';
import { DayTimesComponent } from '../day-times/day-times.component';
import { SearchMikvehComponent } from '../search-mikveh/search-mikveh.component';
import { MenuController } from '@ionic/angular/standalone';
import { CalendarNavigationService } from '../../services/calendar-navigation.service';
import { InputEventOna } from '../../interfaces/cal';
import { DEFAULT_REMINDER_PREFERENCES, REMINDER_CATEGORIES } from '../../utils/calendar-reminders';

describe('SideMenuContentComponent reminder toggle', () => {
  it('shows reminders only in the calendar and switches back off after denied permission', async () => {
    let finishPermission!: () => void;
    const permission = new Promise<void>(resolve => finishPermission = resolve);
    const notifications = {
      supported: true, enabled: signal(false), busy: signal(false), error: signal(''),
      categories: REMINDER_CATEGORIES, preferences: signal({ ...DEFAULT_REMINDER_PREFERENCES }),
      setCategoryEnabled: jasmine.createSpy('setCategoryEnabled').and.resolveTo(),
      setEnabled: jasmine.createSpy('setEnabled').and.returnValue(permission),
    };
    const menuElement = Object.assign(document.createElement('div'), {
      open: jasmine.createSpy('open').and.resolveTo(true),
      isOpen: jasmine.createSpy('isOpen').and.resolveTo(false),
    });
    const menu = jasmine.createSpyObj<MenuController>('menu', ['get']);
    menu.get.and.resolveTo(menuElement as unknown as HTMLIonMenuElement);
    await TestBed.configureTestingModule({
      imports: [SideMenuContentComponent],
      providers: [
        { provide: CalendarNotificationsService, useValue: notifications },
        { provide: MenuController, useValue: menu },
      ],
    }).overrideComponent(SideMenuContentComponent, {
      remove: { imports: [CalComponent, DayTimesComponent, SearchMikvehComponent] },
      add: { schemas: [CUSTOM_ELEMENTS_SCHEMA] },
    }).compileComponents();
    const fixture = TestBed.createComponent(SideMenuContentComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.reminders')).toBeNull();
    fixture.componentInstance.page.set('search');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.reminders')).toBeNull();
    TestBed.inject(CalendarNavigationService).open({
      hebrewDate: { year: 5787, month: 8, day: 10 }, onah: InputEventOna.DAY,
    });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(menu.get).toHaveBeenCalledWith('end');
    expect(menuElement.open).toHaveBeenCalledWith(false);
    const toggle: HTMLIonToggleElement = fixture.nativeElement.querySelector('ion-toggle');
    expect(toggle).not.toBeNull();
    expect(toggle.querySelector('strong')!.textContent).toBe('קבלת תזכורות מהיומן');
    expect(fixture.nativeElement.querySelector('.calendar-content .reminders')).not.toBeNull();
    const personalization: HTMLDetailsElement = fixture.nativeElement.querySelector('.notification-personalization');
    expect(personalization.open).toBeFalse();
    expect(personalization.querySelector('summary')!.textContent).toBe('התאמה אישית');
    personalization.open = true;
    const categoryToggles = Array.from(personalization.querySelectorAll('ion-toggle'));
    expect(categoryToggles.length).toBe(4);
    expect(categoryToggles.map(t => t.textContent!.trim())).toEqual(REMINDER_CATEGORIES.map(c => c.label));
    expect(categoryToggles.every(t => !t.checked && t.disabled)).toBeTrue();
    notifications.enabled.set(true);
    fixture.detectChanges();
    expect(categoryToggles.every(t => t.checked)).toBeTrue();
    expect(categoryToggles.every(t => !t.disabled)).toBeTrue();
    categoryToggles[0].checked = false;
    categoryToggles[0].dispatchEvent(new CustomEvent('ionChange', { detail: { checked: false }, bubbles: true }));
    await fixture.whenStable();
    expect(notifications.setCategoryEnabled).toHaveBeenCalledOnceWith('hefsek', false);
    // A failed preference write restores the stored switch value.
    expect(categoryToggles[0].checked).toBeTrue();
    notifications.preferences.set({ ...DEFAULT_REMINDER_PREFERENCES, mikveh: false });
    fixture.detectChanges();
    expect(categoryToggles.map(t => t.checked)).toEqual([true, true, false, true]);
    notifications.enabled.set(false);
    fixture.detectChanges();
    expect(categoryToggles.every(t => !t.checked && t.disabled)).toBeTrue();
    // Switching the master off hides effective selections without losing them.
    notifications.enabled.set(true);
    fixture.detectChanges();
    expect(categoryToggles.map(t => t.checked)).toEqual([true, true, false, true]);
    notifications.enabled.set(false);
    fixture.detectChanges();
    toggle.checked = true;
    toggle.dispatchEvent(new CustomEvent('ionChange', { detail: { checked: true }, bubbles: true }));
    expect(notifications.setEnabled).toHaveBeenCalledWith(true);
    finishPermission();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(toggle.checked).toBeFalse();
  });

  it('retries a notification open when the menu is still closing', fakeAsync(() => {
    const menuElement = Object.assign(document.createElement('div'), {
      open: jasmine.createSpy('open').and.returnValues(Promise.resolve(false), Promise.resolve(true)),
      // During the closing animation Ionic still reports the menu as open.
      isOpen: jasmine.createSpy('isOpen').and.resolveTo(false),
    });
    TestBed.configureTestingModule({
      imports: [SideMenuContentComponent],
      providers: [
        { provide: CalendarNotificationsService, useValue: {} },
        { provide: MenuController, useValue: { get: async () => menuElement } },
      ],
    }).overrideComponent(SideMenuContentComponent, { set: { template: '', imports: [] } });
    const fixture = TestBed.createComponent(SideMenuContentComponent);
    fixture.detectChanges();
    TestBed.inject(CalendarNavigationService).open({
      hebrewDate: { year: 5787, month: 8, day: 10 }, onah: InputEventOna.DAY,
    });
    fixture.detectChanges();
    tick();
    expect(menuElement.open).toHaveBeenCalledTimes(1);
    menuElement.dispatchEvent(new Event('ionDidClose'));
    tick();
    expect(menuElement.open).toHaveBeenCalledTimes(2);
  }));
});
