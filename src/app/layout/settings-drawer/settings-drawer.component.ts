import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { BackgroundService } from '../../graphics/background.service';
import { BackgroundProgramManager } from '../../graphics/manager';
import { GraphicsRuntime } from '../../graphics/runtime';
import { SettingsService } from '../../settings/setting.service';
import { CloseIconComponent } from '../../shared/icons/close-icon.component';
import { GearIconComponent } from '../../shared/icons/gear-icon.component';

@Component({
  selector: 'app-settings-drawer',
  imports: [CloseIconComponent, GearIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .open-btn {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 50;
      height: 2.75rem;
      padding: 0 0.875rem;
      border-radius: 9999px;
      background: rgba(15,23,42,0.9);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(148,163,184,0.2);
      box-shadow: 0 10px 25px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      gap: 0.375rem;
      color: rgba(148,163,184,1);
      cursor: pointer;
      font-family: inherit;
      font-size: 0.75rem;
      font-weight: 500;
      white-space: nowrap;
      transition: color 0.15s;
    }
    .open-btn:hover { color: #fff; }
    .open-btn:focus-visible { outline: 2px solid oklch(0.62 0.19 272); outline-offset: 2px; }
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
      color: rgba(148,163,184,1);
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
    .opt-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  `],
  template: `
    <!-- Background name pill — click to open settings -->
    <button class="open-btn"
      (click)="open.set(!open())"
      [attr.aria-expanded]="open()"
      [attr.aria-label]="open() ? 'Close settings' : 'Open settings — current background: ' + bgService.name()">
      @if (open()) {
        <app-close-icon class="text-[16px]" />
      } @else {
        <span>{{ bgService.name() }}</span>
        <app-gear-icon class="text-[14px]" />
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
      [attr.aria-hidden]="!open()"
      [attr.inert]="!open() ? '' : null">
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

        <!-- Background -->
        <section class="section" aria-labelledby="bg-label">
          <p id="bg-label" class="section-label">Background</p>
          <div class="grid-3" role="group" aria-label="Background shader">
            @for (bg of bgService.availableBackgrounds; track bg) {
              <button
                [class.active]="bgService.name() === bg"
                class="opt-btn"
                (mouseenter)="programManager.prefetchShader(bg)"
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
                    [disabled]="!runtime.supportsWebGL()"
                    (mouseenter)="programManager.prefetchStrategy(0)"
                    (click)="bgService.toggleRendering(0)">WebGL</button>
            <button [class.active]="bgService.strategy()?.type === 1" class="opt-btn"
                    [disabled]="!runtime.supportsWebGPU()"
                    (mouseenter)="programManager.prefetchStrategy(1)"
                    (click)="bgService.toggleRendering(1)">WebGPU</button>
          </div>
          <div class="btn-group" role="group" aria-label="Thread mode">
            <button [class.active]="bgService.strategy()?.offscreenRendering === false" class="opt-btn"
                    (click)="bgService.toggleWebworker(false)">Main</button>
            <button [class.active]="bgService.strategy()?.offscreenRendering === true" class="opt-btn"
                    [disabled]="!runtime.supportsOffscreen()"
                    (click)="bgService.toggleWebworker(true)">Worker</button>
          </div>
        </section>

        <!-- Frame Rate -->
        <section class="section" aria-labelledby="fps-label">
          <p id="fps-label" class="section-label">Frame Rate</p>
          <div class="btn-group" role="group" aria-label="FPS limit">
            @for (opt of fpsOpts; track opt.value) {
              <button
                [class.active]="settings.fpsLimit() === opt.value"
                class="opt-btn"
                (click)="settings.fpsLimit.set(opt.value)">
                {{ opt.label }}
              </button>
            }
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
            <button class="opt-btn" (click)="bgService.togglePlayback()">
              {{ bgService.paused() ? '▶ Play' : '⏸ Pause' }}
            </button>
          </div>
        </section>

      </div>
    </aside>
  `,
})
export class SettingsDrawerComponent {
  protected open = signal(false);
  protected settings = inject(SettingsService);
  protected bgService = inject(BackgroundService);
  protected programManager = inject(BackgroundProgramManager);
  protected runtime = inject(GraphicsRuntime);

  protected darkOpts = [
    { value: 0, label: 'Auto' },
    { value: 1, label: 'Light' },
    { value: 2, label: 'Dark' },
  ] as const;

  protected fpsOpts = [
    { value: 60,  label: '60' },
    { value: 120, label: '120' },
    { value: 180, label: '180' },
    { value: 0,   label: '∞' },
  ] as const;

}
