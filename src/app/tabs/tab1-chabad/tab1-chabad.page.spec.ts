import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tab1ChabadPage } from './tab1-chabad.page';

describe('Tab1ChabadPage', () => {
  let component: Tab1ChabadPage;
  let fixture: ComponentFixture<Tab1ChabadPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(Tab1ChabadPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
