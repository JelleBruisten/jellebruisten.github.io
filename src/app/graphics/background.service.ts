import { inject, Injectable, signal } from "@angular/core";
import { RenderStrategy, RenderStrategyType } from "./types";
import { SettingsService } from "../settings/setting.service";
import { Subject } from "rxjs";

const availableBackgrounds = [
  'aurora', 'perlin', 'snow', 'shapes', 'particles', 'waves', 'voronoi', 'hex', 'example'
] as const;

type BackgroundName = typeof availableBackgrounds[number];

interface BackgroundEvent {
  type: 'pause' | 'resume' | 'stop',
  data?: unknown | unknown[]
}

@Injectable({ providedIn: 'root'})
export class BackgroundService {
  private readonly settings = inject(SettingsService);

  readonly strategy = signal<RenderStrategy | null>(null);
  readonly showBgSwapPrompt = signal(false);
  readonly name = signal<BackgroundName>(this.settings.effectiveDark() ? 'aurora' : 'perlin');
  readonly availableBackgrounds = [... availableBackgrounds];

  setBackground(name: BackgroundName): void {
    this.name.set(name);
  }
  readonly events$ = new Subject<BackgroundEvent>();

  toggleRendering(type?: RenderStrategyType) {
    const strategy = this.strategy();
    if(!strategy ) {
      return;
    }

    if(typeof type === 'number') {
      this.strategy.set({
        ... strategy,
        type: type
      });
      return;
    }

    if(strategy.type === RenderStrategyType.WebGL) {
      this.strategy.set({
        ... strategy,
        type: RenderStrategyType.WebGPU
      });
    } else {
      this.strategy.set({
        ... strategy,
        type: RenderStrategyType.WebGL
      });
    }
  }

  toggleWebworker(offscreenRendering?: boolean) {
    const strategy = this.strategy();
    if(!strategy) {
      return;
    }

    if(typeof offscreenRendering === 'boolean') {
      this.strategy.set({
        ... strategy,
        offscreenRendering: offscreenRendering
      });
      return;
    }

    // else toggle
    this.strategy.set({
      ... strategy,
      offscreenRendering: !strategy.offscreenRendering
    });
  }

  pause() {
    this.events$.next({
      type: 'pause'
    })
  }

  resume() {
    this.events$.next({
      type: 'resume'
    })
  }

  stop() {
    this.events$.next({
      type: 'stop'
    })
  }
}
