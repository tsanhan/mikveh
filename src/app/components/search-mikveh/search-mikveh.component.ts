import { Component, OnInit } from '@angular/core';
import { IonSearchbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-search-mikveh',
  templateUrl: './search-mikveh.component.html',
  styleUrls: ['./search-mikveh.component.scss'],
  standalone: true,
  imports: [IonSearchbar]
})
export class SearchMikvehComponent  implements OnInit {

  constructor() { }

  ngOnInit() {}

}
