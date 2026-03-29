import { DOCUMENT } from "@angular/common";
import { computed, effect, inject, Injectable, linkedSignal, signal } from "@angular/core";
import { darkModeColor, lightModeColor } from "../graphics/driver/constant";

const enum DarkPreference {
  Auto,
  Light,
  Dark
}

/**
 * Reactive application settings backed by Angular signals.
 *
 * Manages dark mode preference (auto / light / dark), FPS limiter, and debug
 * toggles. The `darkLevel` signal produces a numeric value (0.2 = dark, 1 = light)
 * consumed by the shader uniform, while `effectiveDark` drives the CSS `.dark` class
 * on the document element via an effect.
 */
@Injectable({providedIn: 'root'})
export class SettingsService {
  private readonly document = inject(DOCUMENT);

  // darkmode
  readonly dark = signal<DarkPreference>(DarkPreference.Auto);
  readonly effectiveDark = computed(() => {
    const darkLevel = this.darkLevel();
    return darkLevel <= 0.5;
  });
  readonly darkLevel = linkedSignal<number>(() => {
    const darkPreference = this.dark();
    const isDark = (dark: DarkPreference) => {
      switch(dark) {
        case DarkPreference.Dark:
          return true;
        case DarkPreference.Light:
          return false;

        case DarkPreference.Auto:
        default: {
          const window = this.document.defaultView;
          const prefersDarkMode = window?.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
          return prefersDarkMode;
        }
      }
    }
    return isDark(darkPreference) ? darkModeColor : lightModeColor;
  });

  readonly showFps = signal(false);

  // 0 = unlimited, 60/120/180 = capped
  readonly fpsLimit = signal(60);

  readonly effectiveSettings = computed(() => ({
    dark: this.darkLevel(),
    fpsLimit: this.fpsLimit(),
  }))

  constructor() {
    const document = inject(DOCUMENT);

    effect(() => {
      document.documentElement.classList.toggle(
        'dark',
        this.effectiveDark()
      )
    });
  }
}
