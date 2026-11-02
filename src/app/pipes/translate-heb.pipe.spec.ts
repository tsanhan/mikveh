import { TestBed } from '@angular/core/testing';
import { LocationService } from '../services/location.service';
import { TranslateHebPipe } from './translate-heb.pipe';

describe('TranslateHebPipe', () => {
  it('create an instance', () => {
    TestBed.configureTestingModule({
      providers: [TranslateHebPipe, { provide: LocationService, useValue: {} }],
    });
    const pipe = TestBed.inject(TranslateHebPipe);
    expect(pipe).toBeTruthy();
  });
});
