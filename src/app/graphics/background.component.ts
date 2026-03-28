import { Component, effect, ElementRef, inject, untracked } from "@angular/core";
import { BackgroundProgramManager, ProgramRef } from "./manager";
import { RenderStrategy } from "./types";
import { fromEvent } from "rxjs";
import { DOCUMENT } from "@angular/common";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { BackgroundService } from "./background.service";
import { SettingsService } from "../settings/setting.service";

@Component({
  selector: 'app-background',
  template: ``,
  host: {
    'style': 'position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;'
  }
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
    fromEvent(window, 'resize').pipe(takeUntilDestroyed()).subscribe(() => {
      this.programRef?.programHandle?.resize(window.innerWidth, window.innerHeight)
    });

    // effect for updating background
    effect(() => {
      const name = this.background.name();
      const strategy = this.background.strategy();

      if(name) {
        const ref = this.programRef;
        // Use value equality for strategy to avoid spurious restarts from new-but-equivalent objects.
        // Wrap start() in untracked() so signals read inside start() (e.g. effectiveSettings)
        // don't become tracked dependencies of this effect.
        const strategyMatch = ref?.strategy?.type === strategy?.type &&
                              ref?.strategy?.offscreenRendering === strategy?.offscreenRendering;
        const refMismatch = ref?.name !== name || !strategyMatch;
        console.debug('[bg effect] name=%s strategy=%o refMismatch=%o', name, strategy, refMismatch);
        if(refMismatch) {
          untracked(() => this.start(name, strategy));
        }
      }
    });

    effect(() => {
      const dark = this.settings.darkLevel();
      this.programRef?.programHandle?.darkmode(dark);
    });

    effect(() => {
      const reduced = this.settings.effectiveReducedMotion();
      if (reduced) {
        this.programRef?.programHandle?.pause();
      } else {
        this.programRef?.programHandle?.resume();
      }
    });

    this.background.events$.pipe(takeUntilDestroyed()).subscribe((event) => {
      switch(event.type) {
        case "pause": this.programRef?.programHandle?.pause(); break;
        case "resume": this.programRef?.programHandle?.resume(); break;
        case "stop": this.programRef?.programHandle?.stop(); break;
      }
    })
  }

  async start(name: string, renderStrategy?: RenderStrategy | null) {
    console.debug('[bg start] called name=%s renderStrategy=%o', name, renderStrategy);
    const settings = untracked(() => this.settings.effectiveSettings());
    const program = await this.programManager.startProgram(name, renderStrategy, settings);
    if(program) {
      const isNew = program !== this.programRef;
      console.debug('[bg start] resolved program isNew=%o sameCanvas=%o', isNew, program.canvas === this.programRef?.canvas);
      const canvas = program.canvas;
      (this.host.nativeElement as HTMLElement).replaceChildren(canvas);
      // programRef must be updated before strategy.set() so the reactive effect
      // never sees a stale ref when it re-runs after the strategy signal changes.
      this.programRef = program;
      this.background.strategy.set(program.strategy);
      if (untracked(() => this.settings.effectiveReducedMotion())) {
        program.programHandle?.pause();
      }
    }
  }
}
