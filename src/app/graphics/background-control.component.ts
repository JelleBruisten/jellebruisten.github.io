import { Component, inject } from "@angular/core";
import { BackgroundService } from "./background.service";
import { TitleCasePipe } from "@angular/common";

/** Presentation component for selecting and controlling background shaders. */
@Component({
  selector: `app-background-control`,
  imports: [TitleCasePipe],
  styleUrl: "./background-control.component.css",
  templateUrl: "./background-control.component.html",
})
export class BackgroundControlComponent {
  protected service = inject(BackgroundService);
}
