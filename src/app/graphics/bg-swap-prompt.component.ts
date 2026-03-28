import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { BackgroundService } from './background.service';
import { SettingsService } from '../settings/setting.service';

@Component({
  selector: 'app-bg-swap-prompt',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host {
      position: fixed;
      inset: 0;
      z-index: 59;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.35);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
    }
    .prompt {
      position: relative;
      z-index: 1;
      z-index: 60;
      background: rgba(15,23,42,0.95);
      border: 1px solid rgba(148,163,184,0.2);
      border-radius: 0.75rem;
      padding: 1rem 1.25rem;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      min-width: 17rem;
      max-width: calc(100vw - 3rem);
    }
    .prompt-text {
      font-size: 0.875rem;
      color: rgba(226,232,240,1);
      margin-bottom: 0.875rem;
      line-height: 1.4;
    }
    .prompt-actions {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .btn {
      flex: 1;
      padding: 0.4rem 0;
      font-size: 0.8125rem;
      font-weight: 500;
      border-radius: 0.5rem;
      border: 1px solid transparent;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.15s;
    }
    .btn-yes {
      background: oklch(0.45 0.19 272);
      border-color: oklch(0.55 0.19 272);
      color: #fff;
    }
    .btn-yes:hover { background: oklch(0.52 0.19 272); }
    .btn-no {
      background: rgba(30,41,59,0.8);
      color: rgba(148,163,184,1);
    }
    .btn-no:hover { background: rgba(51,65,85,0.8); color: #fff; }
    .remember {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: rgba(100,116,139,1);
      cursor: pointer;
      user-select: none;
    }
    .remember input { cursor: pointer; accent-color: oklch(0.62 0.19 272); }
  `],
  template: `
    <div class="backdrop"></div>
    <div class="prompt" role="dialog" aria-live="polite">
      <p class="prompt-text">
        Switch to <strong>{{ idealBg() }}</strong>? It's optimised for
        {{ idealBg() === 'aurora' ? 'dark' : 'light' }} mode.
        More backgrounds &amp; options in the <strong>⚙ settings</strong>.
      </p>
      <div class="prompt-actions">
        <button class="btn btn-yes" (click)="accept()">Switch</button>
        <button class="btn btn-no" (click)="decline()">Keep current</button>
      </div>
      <label class="remember">
        <input type="checkbox" [checked]="remember()" (change)="remember.set(!remember())" />
        Remember my choice
      </label>
    </div>
  `,
})
export class BgSwapPromptComponent {
  private readonly bgService = inject(BackgroundService);
  private readonly settings = inject(SettingsService);

  protected remember = signal(false);
  protected readonly idealBg = computed(() =>
    this.settings.effectiveDark() ? 'aurora' : 'perlin'
  );

  protected accept(): void {
    const bg = this.idealBg();
    if (bg === 'aurora' || bg === 'perlin') this.bgService.name.set(bg);
    if (this.remember()) this.settings.setBgSwapChoice('always');
    this.bgService.showBgSwapPrompt.set(false);
  }

  protected decline(): void {
    if (this.remember()) this.settings.setBgSwapChoice('never');
    this.bgService.showBgSwapPrompt.set(false);
  }
}
