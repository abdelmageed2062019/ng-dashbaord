import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateMatchDataComponent } from './update-match-data.component';

describe('UpdateMatchDataComponent', () => {
  let component: UpdateMatchDataComponent;
  let fixture: ComponentFixture<UpdateMatchDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateMatchDataComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateMatchDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
