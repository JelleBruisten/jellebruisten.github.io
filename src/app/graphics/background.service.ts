import { Injectable, signal } from "@angular/core";
import { RenderStrategy, RenderStrategyType } from "./types";
import { Subject } from "rxjs";

const availableBackgrounds = [
  'aurora',
  'particles',
  // 'dots',
  'perlin',
  'snow',
  'shapes',
  'ocean',
  // 'waves',
  // 'voronoi',
  // 'hex',
  // 'bokeh',
  // 'caustics',
  // 'example'
] as const;

type BackgroundName = typeof availableBackgrounds[number];

interface BackgroundEvent {
  type: 'pause' | 'resume' | 'stop',
  data?: unknown | unknown[]
}

function pickDailyBackground(): BackgroundName {
  const d = new Date();
  const day = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000);
  return availableBackgrounds[day % availableBackgrounds.length];
}

@Injectable({ providedIn: 'root'})
export class BackgroundService {
  readonly strategy = signal<RenderStrategy | null>(null);
  readonly name = signal<BackgroundName>(pickDailyBackground());
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

  readonly paused = signal(false);

  pause() {
    this.paused.set(true);
    this.events$.next({ type: 'pause' });
  }

  resume() {
    this.paused.set(false);
    this.events$.next({ type: 'resume' });
  }

  togglePlayback() {
    this.paused() ? this.resume() : this.pause();
  }

  stop() {
    this.events$.next({
      type: 'stop'
    })
  }
}
