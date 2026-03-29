import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { provideRouter } from '@angular/router';
import { PLATFORM_ID, Component } from '@angular/core';
import { BackgroundComponent } from './graphics/background.component';
import { FpsCounterComponent } from './graphics/fps-counter.component';
import { SettingsDrawerComponent } from './layout/settings-drawer/settings-drawer.component';

// Stubs for components that depend on browser-only APIs (WebGL/WebGPU)
@Component({ selector: 'app-background', template: '' })
class BackgroundStubComponent {}

@Component({ selector: 'app-fps-counter', template: '' })
class FpsCounterStubComponent {}

@Component({ selector: 'app-settings-drawer', template: '' })
class SettingsDrawerStubComponent {}

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    })
      .overrideComponent(AppComponent, {
        remove: { imports: [BackgroundComponent, FpsCounterComponent, SettingsDrawerComponent] },
        add: { imports: [BackgroundStubComponent, FpsCounterStubComponent, SettingsDrawerStubComponent] },
      })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the navbar', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-navbar')).toBeTruthy();
  });

  it('should render the router outlet', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });
});
