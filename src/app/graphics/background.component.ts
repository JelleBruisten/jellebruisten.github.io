import { Component, effect, ElementRef, inject, untracked } from "@angular/core";
import { BackgroundProgramManager, ProgramRef } from "./manager";
import { RenderStrategy } from "./types";
import { fromEvent } from "rxjs";
import { DOCUMENT } from "@angular/common";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { BackgroundService } from "./background.service";
import { SettingsService } from "../settings/setting.service";

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
        this.programRef?.programHandle?.resize(window.innerWidth, window.innerHeight);
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
      this.programRef?.programHandle?.darkmode(dark);
    });

    effect(() => {
      const fps = this.settings.fpsLimit();
      this.programRef?.programHandle?.setFpsLimit(fps);
    });

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
