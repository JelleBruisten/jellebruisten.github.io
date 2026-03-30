import { Component, HostListener, inject, PLATFORM_ID, signal } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { RouterOutlet } from "@angular/router";
import { BackgroundComponent } from "./graphics/background.component";
import { FpsCounterComponent } from "./graphics/fps-counter.component";
import { NavbarComponent } from "./layout/navbar/navbar.component";
import { SettingsDrawerComponent } from "./layout/settings-drawer/settings-drawer.component";
import { SettingsService } from "./settings/setting.service";
import { SpecialDayService } from "./settings/special-day.service";

@Component({
  selector: "app-root",
  imports: [
    RouterOutlet,
    BackgroundComponent,
    FpsCounterComponent,
    NavbarComponent,
    SettingsDrawerComponent,
  ],
  template: `
    <!-- Fixed full-screen animated background (browser only — canvas APIs don't exist on server) -->
    @if (isBrowser) {
      <app-background></app-background>
      <app-settings-drawer></app-settings-drawer>
      @if (settings.showFps()) {
        <app-fps-counter></app-fps-counter>
      }
    }

    <!-- Vignette: softens the background edges -->
    <div
      style="position: fixed; inset: 0; z-index: 3; pointer-events: none"
      [style.visibility]="contentHidden() ? 'hidden' : 'visible'"
      [style.background]="
        settings.effectiveDark()
          ? 'linear-gradient(to bottom,rgba(2,6,23,0.45) 0%,rgba(2,6,23,0.10) 35%,rgba(2,6,23,0.10) 65%,rgba(2,6,23,0.45) 100%)'
          : 'linear-gradient(to bottom,rgba(240,245,255,0.25) 0%,rgba(240,245,255,0.05) 35%,rgba(240,245,255,0.05) 65%,rgba(240,245,255,0.25) 100%)'
      "
    ></div>

    <!-- Page content (Ctrl+Shift+H to toggle) -->
    <div
      class="flex flex-col min-h-screen"
      style="position: relative; z-index: 10"
      [style.visibility]="contentHidden() ? 'hidden' : 'visible'"
    >
      <app-navbar></app-navbar>
      <main
        class="flex-1"
        id="main-content"
        tabindex="-1"
        [style.background]="settings.effectiveDark() ? 'rgba(2,6,23,0.55)' : 'rgba(240,245,255,0.38)'"
      >
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [":host { display: block; min-height: 100vh; }"],
})
/**
 * Root component that composes the application shell.
 *
 * Layers the full-screen shader background, a vignette overlay, the navbar,
 * and the routed page content. Browser-only children (canvas, settings drawer,
 * FPS counter) are guarded by `isPlatformBrowser` to prevent SSR failures.
 */
export class AppComponent {
  protected isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected settings = inject(SettingsService);
  protected contentHidden = signal(false);
  private specialDay = inject(SpecialDayService);

  @HostListener("document:keydown", ["$event"])
  onKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey && event.shiftKey && event.key === "H") {
      event.preventDefault();
      this.contentHidden.update((v) => !v);
    }
  }
}
