import { Component, inject } from '@angular/core';
import { EditorComponent } from './editor.component';
import { AdminAuthService } from '../app/admin/admin-auth.service';

@Component({
  selector: 'app-admin',
  imports: [EditorComponent],
  templateUrl: './admin.component.html',
})
export class AdminComponent {
  readonly auth = inject(AdminAuthService);
}
