import { ChangeDetectorRef, Component, effect, ElementRef, inject, output } from "@angular/core";
import { BackgroundProgramManager, ProgramRef } from "./manager";
import { RenderStrategy } from "./types";
import { filter, fromEvent } from "rxjs";
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
    // we don't need this component to be attached to the changeDetection scheduler
    inject(ChangeDetectorRef).detach();

    // handle resize
    const document = inject(DOCUMENT);
    const window = document.defaultView as Window;
    fromEvent(window, 'resize').pipe(takeUntilDestroyed()).subscribe(() => {
      this.programRef?.programHandle?.resize(window.innerWidth, window.innerHeight)
    });

    const body = document.body;
    // prevent mouse movement events effecting the background if reduced motion is on
    fromEvent<MouseEvent>(body, 'mousemove').pipe(filter(() => !this.settings.effectiveReducedMotion()), takeUntilDestroyed()).subscribe((event) => {
      // correct mouse position based on boundingRect
      const rect = body.getBoundingClientRect();

      const mouseX = ((event.clientX) - rect.left);
      const mouseY = 1 - ((event.clientY) - rect.top);  // Normalize Y coordinate
      this.programRef?.programHandle?.mousemove(mouseX, mouseY)
    });

    // effect for updating background
    effect(() => {
      const name = this.background.name();
      const strategy = this.background.strategy();

      if(name) {
        // prevent retriggers with same name and strategy
        if(this.programRef?.name !== name || this.programRef?.strategy !== strategy) {
          this.start(name, strategy);
        }
      }
    });

    effect(() => {
      const dark = this.settings.darkLevel();
      this.programRef?.programHandle?.darkmode(dark);
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
    const program = await this.programManager.startProgram(name, renderStrategy, this.settings.effectiveSettings());
    if(program) {
      const canvas = program.canvas;
      (this.host.nativeElement as HTMLElement).replaceChildren(canvas);
      this.background.strategy.set(program.strategy);
      this.programRef = program;
    }
  }
}
