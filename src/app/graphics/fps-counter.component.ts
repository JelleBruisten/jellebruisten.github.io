import { ChangeDetectionStrategy, Component, OnDestroy, signal } from '@angular/core';

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
  template: `{{ fps() }} fps`,
})
export class FpsCounterComponent implements OnDestroy {
  protected fps = signal(0);

  private frameCount = 0;
  private lastTime = performance.now();
  private rafId = 0;

  constructor() {
    this.loop();
  }

  private loop(): void {
    this.rafId = requestAnimationFrame(() => {
      this.frameCount++;
      const now = performance.now();
      const elapsed = now - this.lastTime;
      if (elapsed >= 500) {
        this.fps.set(Math.round((this.frameCount / elapsed) * 1000));
        this.frameCount = 0;
        this.lastTime = now;
      }
      this.loop();
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
  }
}
