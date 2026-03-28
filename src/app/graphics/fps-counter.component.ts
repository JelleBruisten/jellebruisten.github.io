import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { BackgroundProgramManager } from './manager';
import { SettingsService } from '../settings/setting.service';

@Component({
  selector: 'app-fps-counter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host {
      position: fixed;
      bottom: 1.5rem;
      left: 1.5rem;
      z-index: 60;
      font-family: ui-monospace, monospace;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.5rem;
      border-radius: 0.375rem;
      background: rgba(30,40,60,0.85);
      border: 1px solid rgba(148,163,184,0.25);
      color: #a3e635;
      pointer-events: none;
      letter-spacing: 0.04em;
    }
  `],
  template: `{{ display() }}`,
})
export class FpsCounterComponent {
  private readonly manager = inject(BackgroundProgramManager);
  private readonly settings = inject(SettingsService);

  protected display = computed(() => {
    const fps = this.manager.drawFps();
    const limit = this.settings.fpsLimit();
    return limit > 0
      ? `${fps} / ${limit} fps`
      : `${fps} fps`;
  });
}
