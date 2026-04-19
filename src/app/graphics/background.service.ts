import { inject, Injectable, linkedSignal, signal } from "@angular/core";
import { RenderStrategy, RenderStrategyType } from "./types";
import { Subject } from "rxjs";
import { SpecialDayService } from "../settings/special-day.service";

/** Standard backgrounds shown in the settings drawer. Particles is the default. */
const standardBackgrounds = ["particles", "aurora", "perlin", "snow", "shapes", "ocean"] as const;

type BackgroundName =
  | (typeof standardBackgrounds)[number]
  | "fireworks"
  | "fireworks-orange"
  | "hearts"
  | "clovers"
  | "confetti"
  | "spooky"
  | "eggs"
  | "leaves"
  | "lights";

interface BackgroundEvent {
  type: "pause" | "resume" | "stop";
  data?: unknown | unknown[];
}

/**
 * Manages the active background shader and its render strategy.
 *
 * Defaults to the particles shader unless a special day overrides it. Exposes
 * signals for the current shader name and render strategy (WebGL / WebGPU,
 * main thread / worker), and emits playback events (pause, resume, stop)
 * consumed by {@link BackgroundComponent}.
 */
@Injectable({ providedIn: "root" })
export class BackgroundService {
  private readonly specialDay = inject(SpecialDayService);

  readonly strategy = signal<RenderStrategy | null>(null);
  readonly name = linkedSignal<BackgroundName>(() => {
    const theme = this.specialDay.theme();
    return (theme?.shader ?? "particles") as BackgroundName;
  });
  readonly availableBackgrounds = [...standardBackgrounds];

  setBackground(name: BackgroundName): void {
    this.name.set(name);
  }
  readonly events$ = new Subject<BackgroundEvent>();

  /** Switches the graphics API. If a specific type is given, sets it directly; otherwise toggles between WebGL and WebGPU. */
  toggleRendering(type?: RenderStrategyType) {
    const strategy = this.strategy();
    if (!strategy) {
      return;
    }

    if (typeof type === "number") {
      this.strategy.set({
        ...strategy,
        type: type,
      });
      return;
    }

    if (strategy.type === RenderStrategyType.WebGL) {
      this.strategy.set({
        ...strategy,
        type: RenderStrategyType.WebGPU,
      });
    } else {
      this.strategy.set({
        ...strategy,
        type: RenderStrategyType.WebGL,
      });
    }
  }

  /** Switches between main-thread and OffscreenCanvas worker rendering. Accepts an explicit value or toggles. */
  toggleWebworker(offscreenRendering?: boolean) {
    const strategy = this.strategy();
    if (!strategy) {
      return;
    }

    if (typeof offscreenRendering === "boolean") {
      this.strategy.set({
        ...strategy,
        offscreenRendering: offscreenRendering,
      });
      return;
    }

    // else toggle
    this.strategy.set({
      ...strategy,
      offscreenRendering: !strategy.offscreenRendering,
    });
  }

  readonly paused = signal(false);

  pause() {
    this.paused.set(true);
    this.events$.next({ type: "pause" });
  }

  resume() {
    this.paused.set(false);
    this.events$.next({ type: "resume" });
  }

  togglePlayback() {
    if (this.paused()) {
      this.resume();
    } else {
      this.pause();
    }
  }

  stop() {
    this.events$.next({
      type: "stop",
    });
  }
}
