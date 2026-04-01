import { Component, effect, ElementRef, inject, untracked } from "@angular/core";
import { BackgroundProgramManager, ProgramRef } from "./manager";
import { RenderStrategy } from "./types";
import { fromEvent } from "rxjs";
import { DOCUMENT } from "@angular/common";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { BackgroundService } from "./background.service";
import { SettingsService } from "../settings/setting.service";
import { QualityPreference, QualityTier, qualityLevel, qualityScale } from "./quality";

/**
 * Full-screen animated background rendered via WebGL or WebGPU.
 *
 * Reacts to changes in shader name, render strategy, and dark mode via effects.
 * Uses `untracked()` to prevent signal reads inside `start()` from becoming
 * effect dependencies. Listens for window resize and playback events
 * (pause / resume) from {@link BackgroundService}.
 */
@Component({
  selector: "app-background",
  template: ``,
  host: {
    style: "position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;",
  },
})
export class BackgroundComponent {
  private readonly host = inject(ElementRef);
  private readonly programManager = inject(BackgroundProgramManager);
  private readonly background = inject(BackgroundService);
  private readonly settings = inject(SettingsService);
  private programRef: ProgramRef | null = null;

  constructor() {
    // handle resize
    const document = inject(DOCUMENT);
    const window = document.defaultView as Window;
    fromEvent(window, "resize")
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        const scale = this.programRef?.scale ?? 1.0;
        this.programRef?.programHandle?.resize(
          Math.round(window.innerWidth * scale),
          Math.round(window.innerHeight * scale),
        );
      });

    // effect for updating background
    effect(() => {
      const name = this.background.name();
      const strategy = this.background.strategy();

      if (name) {
        const ref = this.programRef;
        // Use value equality for strategy to avoid spurious restarts from new-but-equivalent objects.
        // Wrap start() in untracked() so signals read inside start() (e.g. effectiveSettings)
        // don't become tracked dependencies of this effect.
        const strategyMatch =
          ref?.strategy?.type === strategy?.type &&
          ref?.strategy?.offscreenRendering === strategy?.offscreenRendering;
        const refMismatch = ref?.name !== name || !strategyMatch;
        if (this.settings.debugLogs())
          console.debug(
            "[bg effect] name=%s strategy=%o refMismatch=%o",
            name,
            strategy,
            refMismatch,
          );
        if (refMismatch) {
          untracked(() => this.start(name, strategy));
        }
      }
    });

    effect(() => {
      const dark = this.settings.darkLevel();
      this.tweenShaderDark(dark);
    });

    effect(() => {
      const fps = this.settings.fpsLimit();
      this.programRef?.programHandle?.setFpsLimit(fps);
    });

    // Quality change: update shader uniform + resolution scale
    effect(() => {
      const quality = this.settings.quality();
      const ref = this.programRef;
      if (!ref?.programHandle) return;

      const level = qualityLevel(quality);
      const scale = qualityScale(quality);
      ref.programHandle.setQuality(level);

      // Resize canvas to match new quality scale
      if (ref.scale !== scale) {
        ref.scale = scale;
        const w = Math.round(window.innerWidth * scale);
        const h = Math.round(window.innerHeight * scale);
        ref.programHandle.resize(w, h);
      }
    });

    // Auto-detection: measure FPS for first 2 seconds, downgrade if needed
    this.setupAutoQualityDetection();

    this.background.events$.pipe(takeUntilDestroyed()).subscribe((event) => {
      switch (event.type) {
        case "pause":
          this.programRef?.programHandle?.pause();
          break;
        case "resume":
          this.programRef?.programHandle?.resume();
          break;
        case "stop":
          this.programRef?.programHandle?.stop();
          break;
      }
    });
  }

  /** Current dark level sent to the shader — tracked outside signals to avoid re-triggering effects. */
  private shaderDark = NaN;
  private darkRafId = 0;

  /** Smoothly animates the shader's dark uniform toward `target` over 300 ms. */
  private tweenShaderDark(target: number): void {
    cancelAnimationFrame(this.darkRafId);
    const from = this.shaderDark;

    // First call (or same value) → apply immediately, no animation
    if (isNaN(from) || from === target) {
      this.shaderDark = target;
      this.programRef?.programHandle?.darkmode(target);
      return;
    }

    const duration = 300;
    const startTime = performance.now();
    const tick = () => {
      /** 0 → 1 normalized progress of the animation (clamped so it never overshoots). */
      const progress = Math.min((performance.now() - startTime) / duration, 1);
      const eased = progress * progress * (3 - 2 * progress); // smoothstep
      this.shaderDark = from + (target - from) * eased;
      this.programRef?.programHandle?.darkmode(this.shaderDark);
      if (progress < 1) this.darkRafId = requestAnimationFrame(tick);
    };
    this.darkRafId = requestAnimationFrame(tick);
  }

  /**
   * Reactive quality auto-detection.
   *
   * - FPS drops below 20 → immediately drop one quality tier (halves resolution)
   * - FPS stays above 55 for 6 consecutive samples (~3 s) → try one tier higher
   * - Resets when the shader changes
   */
  private setupAutoQualityDetection(): void {
    const UPGRADE_STREAK_NEEDED = 6; // 6 × 500ms = 3 seconds of sustained high FPS
    let goodStreak = 0;

    // Reset streak when shader changes
    effect(() => {
      this.background.name();
      goodStreak = 0;
    });

    effect(() => {
      const fps = this.programManager.drawFps();
      if (fps === 0) return;

      if (untracked(() => this.settings.qualityPreference()) !== QualityPreference.Auto) return;

      const current = untracked(() => this.settings.quality());

      // Immediate downgrade on poor FPS
      if (fps < 20 && current > QualityTier.Low) {
        goodStreak = 0;
        const next = (current - 1) as QualityTier;
        if (this.settings.debugLogs()) {
          console.debug("[quality auto] FPS=%d → downgrade %d → %d", fps, current, next);
        }
        this.settings.quality.set(next);
        return;
      }

      // Cautious upgrade after sustained good FPS
      if (fps >= 55 && current < QualityTier.High) {
        goodStreak++;
        if (goodStreak >= UPGRADE_STREAK_NEEDED) {
          goodStreak = 0;
          const next = (current + 1) as QualityTier;
          if (this.settings.debugLogs()) {
            console.debug("[quality auto] FPS=%d → upgrade %d → %d", fps, current, next);
          }
          this.settings.quality.set(next);
        }
      } else {
        goodStreak = 0;
      }
    });
  }

  /**
   * Starts a new shader program, replaces the canvas in the DOM, and updates
   * the strategy signal. Called from within `untracked()` to avoid creating
   * circular effect dependencies.
   */
  async start(name: string, renderStrategy?: RenderStrategy | null) {
    if (this.settings.debugLogs())
      console.debug("[bg start] called name=%s renderStrategy=%o", name, renderStrategy);
    const settings = untracked(() => this.settings.effectiveSettings());
    const program = await this.programManager.startProgram(name, renderStrategy, settings);
    if (program) {
      const isNew = program !== this.programRef;
      if (this.settings.debugLogs())
        console.debug(
          "[bg start] resolved program isNew=%o sameCanvas=%o",
          isNew,
          program.canvas === this.programRef?.canvas,
        );
      const canvas = program.canvas;
      (this.host.nativeElement as HTMLElement).replaceChildren(canvas);
      // programRef must be updated before strategy.set() so the reactive effect
      // never sees a stale ref when it re-runs after the strategy signal changes.
      this.programRef = program;
      this.background.strategy.set(program.strategy);
    }
  }
}
