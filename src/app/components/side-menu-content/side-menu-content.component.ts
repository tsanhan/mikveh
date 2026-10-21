import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  DestroyRef,
  OnInit,
  signal,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import {
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonButton,
  IonFab,
  IonFabButton,
  IonImg,
  IonText,
  IonToggle,
  MenuController,
} from '@ionic/angular/standalone';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { bootstrapClock } from '@ng-icons/bootstrap-icons';
import { timeOutline, searchOutline, logoWhatsapp, calendarOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { CommonModule } from '@angular/common';
import { DayTimesComponent } from '../day-times/day-times.component';
import { SearchMikvehComponent } from '../search-mikveh/search-mikveh.component';
import { CalComponent } from "../cal/cal.component";
import { CalendarNotificationsService } from '../../services/calendar-notifications.service';
import type { ToggleCustomEvent } from '@ionic/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CalendarNavigationService } from '../../services/calendar-navigation.service';
@Component({
    selector: 'app-side-menu-content',
    templateUrl: './side-menu-content.component.html',
    styleUrls: ['./side-menu-content.component.scss'],
    imports: [
        CommonModule,
        IonToggle,
        IonButton,
        IonIcon,
        DayTimesComponent,
        SearchMikvehComponent,
        CalComponent
    ],
    viewProviders: [provideIcons({ bootstrapClock })],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SideMenuContentComponent implements OnInit {
  readonly notifications = inject(CalendarNotificationsService);
  private readonly navigation = inject(CalendarNavigationService);
  private readonly menu = inject(MenuController);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private openingCalendar = false;
  @ViewChild('data') private data?: ElementRef<HTMLElement>;
  page: WritableSignal<'time' | 'search' | 'cal'> = signal('time');

  countryCode: string = '972';
  wsNumber: string = '584298770';
  url: string =
    'https://wa.me/' +
    this.countryCode +
    this.wsNumber +
    '?text=%D7%A9%D7%9C%D7%95%D7%9D.%20%D7%90%D7%A0%D7%99%20%D7%A8%D7%95%D7%A6%D7%94%20%D7%9C%D7%A9%D7%90%D7%95%D7%9C%20%D7%A9%D7%90%D7%9C%D7%94%20%D7%91%D7%A0%D7%95%D7%92%D7%A2%20%D7%9C%D7%94%D7%9C%D7%9B%D7%95%D7%AA%20%D7%A0%D7%99%D7%93%D7%94.';

  constructor() {
    addIcons({timeOutline,calendarOutline,searchOutline,logoWhatsapp});
    this.navigation.requests$.pipe(takeUntilDestroyed()).subscribe(target => {
      if (!target) return;
      this.page.set('cal');
      // Wait until the requested calendar tab has rendered on a cold start.
      afterNextRender(() => {
        this.data?.nativeElement.scrollTo({ top: 0 });
        void this.openCalendar();
      }, { injector: this.injector });
    });
  }

  private async openCalendar(): Promise<void> {
    if (this.openingCalendar) return;
    this.openingCalendar = true;
    try {
      const menu = await this.menu.get('end');
      if (!menu) return;
      // Ionic rejects open() while a previous menu transition is running.
      // Retry after it settles; opening without animation also avoids a delayed
      // animation when Android is still bringing the WebView to the foreground.
      for (let attempt = 0; attempt < 3 && !this.destroyRef.destroyed && this.page() === 'cal'; attempt++) {
        if (await menu.open(false)) return;
        await new Promise<void>(resolve => {
          const done = () => {
            clearTimeout(timeout);
            menu.removeEventListener('ionDidClose', done);
            menu.removeEventListener('ionDidOpen', done);
            resolve();
          };
          const timeout = setTimeout(done, 1000);
          menu.addEventListener('ionDidClose', done, { once: true });
          menu.addEventListener('ionDidOpen', done, { once: true });
        });
        if (await menu.isOpen()) return;
      }
    } finally {
      this.openingCalendar = false;
    }
  }

  async onNotificationsChange(event: ToggleCustomEvent): Promise<void> {
    await this.notifications.setEnabled(event.detail.checked);
    // Ionic changes its own checked value before emitting ionChange. Restore
    // the persisted value if permission was denied and the signal stayed false.
    event.target.checked = this.notifications.enabled();
  }

  ngOnInit() {
    console.log('SideMenuContentComponent');
  }
}
