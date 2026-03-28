import { Component, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { BackgroundComponent } from './graphics/background.component';
import { BgSwapPromptComponent } from './graphics/bg-swap-prompt.component';
import { BackgroundService } from './graphics/background.service';
import { FpsCounterComponent } from './graphics/fps-counter.component';
import { NavbarComponent } from './layout/navbar/navbar.component';
import { SettingsDrawerComponent } from './layout/settings-drawer/settings-drawer.component';
import { SettingsService } from './settings/setting.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, BackgroundComponent, BgSwapPromptComponent, FpsCounterComponent, NavbarComponent, SettingsDrawerComponent],
  template: `
    <!-- Fixed full-screen animated background (browser only — canvas APIs don't exist on server) -->
    @if (isBrowser) {
      <app-background></app-background>
      <app-settings-drawer></app-settings-drawer>
      @if (settings.showFps()) {
        <app-fps-counter></app-fps-counter>
      }
      @if (bgService.showBgSwapPrompt()) {
        <app-bg-swap-prompt></app-bg-swap-prompt>
      }
    }

    <!-- Vignette: softens the background edges -->
    <div style="position:fixed;inset:0;z-index:3;pointer-events:none;"
         [style.background]="settings.effectiveDark()
           ? 'linear-gradient(to bottom,rgba(2,6,23,0.45) 0%,rgba(2,6,23,0.10) 35%,rgba(2,6,23,0.10) 65%,rgba(2,6,23,0.45) 100%)'
           : 'linear-gradient(to bottom,rgba(240,245,255,0.25) 0%,rgba(240,245,255,0.05) 35%,rgba(240,245,255,0.05) 65%,rgba(240,245,255,0.25) 100%)'">
    </div>

    <!-- Page content -->
    <div class="flex flex-col min-h-screen" style="position:relative;z-index:10">
      <app-navbar></app-navbar>
      <main class="flex-1" id="main-content" tabindex="-1"
            [style.background]="settings.effectiveDark() ? 'rgba(2,6,23,0.55)' : 'rgba(240,245,255,0.38)'"
            style="backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [':host { display: block; min-height: 100vh; }'],
})
export class AppComponent {
  protected isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected settings = inject(SettingsService);
  protected bgService = inject(BackgroundService);
}
