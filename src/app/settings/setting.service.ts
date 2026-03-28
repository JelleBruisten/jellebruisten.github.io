import { DOCUMENT } from "@angular/common";
import { computed, effect, inject, Injectable, linkedSignal, signal } from "@angular/core";
import { darkModeColor, lightModeColor } from "../graphics/driver/constant";

const enum MotionPreference {
  Auto,
  Reduced,
  NoPreference
}

const enum DarkPreference {
  Auto,
  Light,
  Dark
}

interface EffectiveSettings {
  motion: boolean,
  dark: boolean
}

@Injectable({providedIn: 'root'})
export class SettingsService {
  private readonly document = inject(DOCUMENT);

  // motion
  readonly motion = signal<MotionPreference>(MotionPreference.Reduced);
  readonly effectiveReducedMotion = computed(() => {
    const motion = this.motion();
    switch(motion) {
      case MotionPreference.Reduced:
        return true;
      case MotionPreference.NoPreference:
        return false;

      case MotionPreference.Auto:
      default:
        const window = this.document.defaultView;
        const prefersReduced = window?.matchMedia?.('(prefers-reduced-motion)')?.matches;
        return !!prefersReduced;
    }
  })

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
        default:
          const window = this.document.defaultView;
          const prefersDarkMode = window?.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
          return prefersDarkMode;
      }
    }
    return isDark(darkPreference) ? darkModeColor : lightModeColor;
  });

  readonly showFps = signal(false);

  readonly bgSwapChoice = signal<'ask' | 'always' | 'never'>(
    (this.document.defaultView?.localStorage?.getItem('bgSwapChoice') as 'ask' | 'always' | 'never') ?? 'ask'
  );

  setBgSwapChoice(choice: 'ask' | 'always' | 'never'): void {
    this.bgSwapChoice.set(choice);
    this.document.defaultView?.localStorage?.setItem('bgSwapChoice', choice);
  }

  clearAllData(): void {
    this.document.defaultView?.localStorage?.clear();
    this.dark.set(DarkPreference.Auto);
    this.motion.set(MotionPreference.Reduced);
    this.showFps.set(false);
    this.bgSwapChoice.set('ask');
  }

  readonly effectiveSettings = computed(() => {
    return {
      dark: this.darkLevel(),
      motion: this.effectiveReducedMotion()
    } as const
  })

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
