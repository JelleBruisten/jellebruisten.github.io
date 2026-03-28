import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { BackgroundService } from '../../graphics/background.service';
import { SettingsService } from '../../settings/setting.service';

@Component({
  selector: 'app-settings-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .gear-btn {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 50;
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 9999px;
      background: rgba(15,23,42,0.9);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(148,163,184,0.2);
      box-shadow: 0 10px 25px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(148,163,184,1);
      cursor: pointer;
      transition: transform 0.15s, color 0.15s;
    }
    .gear-btn:hover { transform: scale(1.1); color: #fff; }
    .gear-btn:active { transform: scale(0.95); }
    .gear-btn:focus-visible { outline: 2px solid oklch(0.62 0.19 272); outline-offset: 2px; }
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 40;
      background: rgba(0,0,0,0.3);
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
    }
    .drawer {
      position: fixed;
      top: 0;
      right: 0;
      height: 100%;
      width: 20rem;
      z-index: 50;
      background: rgba(2,6,23,0.95);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-left: 1px solid rgba(148,163,184,0.15);
      box-shadow: -20px 0 60px rgba(0,0,0,0.5);
      overflow-y: auto;
      transition: transform 0.3s ease-in-out;
    }
    .drawer-inner { padding: 1.5rem; }
    .drawer-title {
      font-size: 0.9375rem;
      font-weight: 600;
      color: #fff;
      margin-bottom: 1.5rem;
      margin-top: 0.5rem;
    }
    .section { margin-bottom: 1.5rem; }
    .section-label {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: rgba(100,116,139,1);
      margin-bottom: 0.75rem;
    }
    .btn-group { display: flex; gap: 0.5rem; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }
    .opt-btn {
      flex: 1;
      padding: 0.5rem 0;
      font-size: 0.875rem;
      border-radius: 0.5rem;
      background: rgba(30,41,59,0.8);
      color: rgba(148,163,184,1);
      border: 1px solid transparent;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
      font-family: inherit;
    }
    .opt-btn:hover { background: rgba(51,65,85,0.8); color: #fff; }
    .opt-btn.active {
      background: rgba(99,102,241,0.15);
      border-color: oklch(0.62 0.19 272);
      color: oklch(0.72 0.17 272);
    }
    .opt-btn:focus-visible { outline: 2px solid oklch(0.62 0.19 272); outline-offset: 2px; }
    .danger-btn {
      width: 100%;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      border-radius: 0.5rem;
      background: rgba(239,68,68,0.08);
      color: rgba(252,165,165,1);
      border: 1px solid rgba(239,68,68,0.25);
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
      font-family: inherit;
      text-align: left;
    }
    .danger-btn:hover { background: rgba(239,68,68,0.18); color: #fff; }
    .danger-btn:focus-visible { outline: 2px solid rgba(239,68,68,0.7); outline-offset: 2px; }
  `],
  template: `
    <!-- Floating gear button -->
    <button class="gear-btn"
      (click)="open.set(!open())"
      [attr.aria-expanded]="open()"
      [attr.aria-label]="open() ? 'Close settings' : 'Open settings'">
      @if (!open()) {
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      } @else {
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
        </svg>
      }
    </button>

    <!-- Backdrop -->
    @if (open()) {
      <div class="backdrop" (click)="open.set(false)" aria-hidden="true"></div>
    }

    <!-- Drawer panel -->
    <aside class="drawer"
      [style.transform]="open() ? 'translateX(0)' : 'translateX(100%)'"
      aria-label="Settings panel"
      [attr.aria-hidden]="!open()">
      <div class="drawer-inner">
        <h2 class="drawer-title">Settings</h2>

        <!-- Appearance -->
        <section class="section" aria-labelledby="appearance-label">
          <p id="appearance-label" class="section-label">Appearance</p>
          <div class="btn-group" role="group" aria-label="Color theme">
            @for (opt of darkOpts; track opt.value) {
              <button
                [class.active]="settings.dark() === opt.value"
                class="opt-btn"
                (click)="settings.dark.set(opt.value)">
                {{ opt.label }}
              </button>
            }
          </div>
        </section>

        <!-- Motion -->
        <section class="section" aria-labelledby="motion-label">
          <p id="motion-label" class="section-label">Motion</p>
          <div class="btn-group" role="group" aria-label="Motion preference">
            @for (opt of motionOpts; track opt.value) {
              <button
                [class.active]="settings.motion() === opt.value"
                class="opt-btn"
                (click)="settings.motion.set(opt.value)">
                {{ opt.label }}
              </button>
            }
          </div>
        </section>

        <!-- Background -->
        <section class="section" aria-labelledby="bg-label">
          <p id="bg-label" class="section-label">Background</p>
          <div class="grid-3" role="group" aria-label="Background shader">
            @for (bg of bgService.availableBackgrounds; track bg) {
              <button
                [class.active]="bgService.name() === bg"
                class="opt-btn"
                (click)="bgService.name.set(bg)">
                {{ bg }}
              </button>
            }
          </div>
        </section>

        <!-- Renderer -->
        <section class="section" aria-labelledby="renderer-label">
          <p id="renderer-label" class="section-label">Renderer</p>
          <div class="btn-group" style="margin-bottom:0.5rem" role="group" aria-label="Graphics API">
            <button [class.active]="bgService.strategy()?.type === 0" class="opt-btn"
                    (click)="bgService.toggleRendering(0)">WebGL</button>
            <button [class.active]="bgService.strategy()?.type === 1" class="opt-btn"
                    (click)="bgService.toggleRendering(1)">WebGPU</button>
          </div>
          <div class="btn-group" role="group" aria-label="Thread mode">
            <button [class.active]="bgService.strategy()?.offscreenRendering === false" class="opt-btn"
                    (click)="bgService.toggleWebworker(false)">Main</button>
            <button [class.active]="bgService.strategy()?.offscreenRendering === true" class="opt-btn"
                    (click)="bgService.toggleWebworker(true)">Worker</button>
          </div>
        </section>

        <!-- Debug -->
        <section class="section" aria-labelledby="debug-label">
          <p id="debug-label" class="section-label">Debug</p>
          <div class="btn-group">
            <button class="opt-btn" [class.active]="settings.showFps()" (click)="settings.showFps.set(!settings.showFps())">FPS Counter</button>
          </div>
        </section>

        <!-- Playback -->
        <section class="section" aria-labelledby="playback-label">
          <p id="playback-label" class="section-label">Playback</p>
          <div class="btn-group">
            <button class="opt-btn" (click)="bgService.resume()">▶ Play</button>
            <button class="opt-btn" (click)="bgService.pause()">⏸ Pause</button>
          </div>
        </section>

        <!-- Data -->
        <section aria-labelledby="data-label">
          <p id="data-label" class="section-label">Data</p>
          <button class="danger-btn" (click)="clearData()">
            Clear all settings &amp; remembered choices
          </button>
        </section>
      </div>
    </aside>
  `,
})
export class SettingsDrawerComponent {
  protected open = signal(false);
  protected settings = inject(SettingsService);
  protected bgService = inject(BackgroundService);

  protected clearData(): void {
    this.settings.clearAllData();
  }

  protected darkOpts = [
    { value: 0, label: 'Auto' },
    { value: 1, label: 'Light' },
    { value: 2, label: 'Dark' },
  ] as const;

  protected motionOpts = [
    { value: 0, label: 'Auto' },
    { value: 1, label: 'Reduced' },
    { value: 2, label: 'Full' },
  ] as const;
}
