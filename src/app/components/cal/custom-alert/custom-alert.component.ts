import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-custom-alert',
  standalone: true,
  imports: [],
  template: `<p>custom-alert works!</p>`,
  styleUrl: './custom-alert.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomAlertComponent { }
