import { DOCUMENT } from "@angular/common";
import { computed, effect, inject, Injectable, signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute } from "@angular/router";
import { map } from "rxjs";

export type SpecialDayName =
  | "new-year"
  | "lunar-new-year"
  | "birthday"
  | "carnival"
  | "valentines"
  | "st-patricks"
  | "april-fools"
  | "earth-day"
  | "kingsday"
  | "liberation-day"
  | "easter"
  | "halloween"
  | "day-of-dead"
  | "diwali"
  | "christmas";

interface SpecialDayTheme {
  shader: string;
  brand: string;
  brandLight: string;
  brandDark: string;
  greeting: string;
  wikiUrl?: string;
  cssClass?: string;
}

/** Maps short query param aliases to SpecialDayName for ?special=... URLs. */
const queryAliases: Record<string, SpecialDayName> = {
  newyear: "new-year",
  nye: "new-year",
  "new-year": "new-year",
  lunar: "lunar-new-year",
  "lunar-new-year": "lunar-new-year",
  chinese: "lunar-new-year",
  cny: "lunar-new-year",
  birthday: "birthday",
  bday: "birthday",
  carnival: "carnival",
  "mardi-gras": "carnival",
  mardigras: "carnival",
  valentine: "valentines",
  valentines: "valentines",
  val: "valentines",
  patrick: "st-patricks",
  patricks: "st-patricks",
  "st-patricks": "st-patricks",
  stpat: "st-patricks",
  fools: "april-fools",
  "april-fools": "april-fools",
  aprilfools: "april-fools",
  earth: "earth-day",
  "earth-day": "earth-day",
  earthday: "earth-day",
  king: "kingsday",
  kings: "kingsday",
  kingsday: "kingsday",
  liberation: "liberation-day",
  "liberation-day": "liberation-day",
  bevrijding: "liberation-day",
  easter: "easter",
  halloween: "halloween",
  hween: "halloween",
  dotd: "day-of-dead",
  "day-of-dead": "day-of-dead",
  dead: "day-of-dead",
  diwali: "diwali",
  christmas: "christmas",
  xmas: "christmas",
};

const themes: Record<SpecialDayName, SpecialDayTheme> = {
  "new-year": {
    shader: "fireworks",
    brand: "oklch(0.75 0.16 85)",
    brandLight: "oklch(0.85 0.12 85)",
    brandDark: "oklch(0.60 0.20 85)",
    greeting: "Happy New Year!",
    wikiUrl: "https://en.wikipedia.org/wiki/New_Year%27s_Day",
  },
  "lunar-new-year": {
    shader: "lights",
    brand: "oklch(0.65 0.22 30)",
    brandLight: "oklch(0.75 0.18 30)",
    brandDark: "oklch(0.50 0.25 25)",
    greeting: "Happy Lunar New Year!",
    wikiUrl: "https://en.wikipedia.org/wiki/Lunar_New_Year",
  },
  birthday: {
    shader: "fireworks",
    brand: "oklch(0.75 0.16 85)",
    brandLight: "oklch(0.82 0.13 85)",
    brandDark: "oklch(0.62 0.19 85)",
    greeting: "It's my birthday!",
  },
  carnival: {
    shader: "confetti",
    brand: "oklch(0.68 0.24 310)",
    brandLight: "oklch(0.76 0.20 310)",
    brandDark: "oklch(0.52 0.27 320)",
    greeting: "Happy Carnival!",
    wikiUrl: "https://en.wikipedia.org/wiki/Carnival",
  },
  kingsday: {
    shader: "fireworks-orange",
    brand: "oklch(0.70 0.18 55)",
    brandLight: "oklch(0.78 0.15 55)",
    brandDark: "oklch(0.55 0.22 55)",
    greeting: "Happy King's Day!",
    wikiUrl: "https://en.wikipedia.org/wiki/Koningsdag",
  },
  "liberation-day": {
    shader: "fireworks",
    brand: "oklch(0.60 0.20 250)",
    brandLight: "oklch(0.70 0.16 250)",
    brandDark: "oklch(0.48 0.22 250)",
    greeting: "Happy Liberation Day!",
    wikiUrl: "https://en.wikipedia.org/wiki/Liberation_Day_(Netherlands)",
  },
  valentines: {
    shader: "hearts",
    brand: "oklch(0.60 0.25 10)",
    brandLight: "oklch(0.70 0.20 10)",
    brandDark: "oklch(0.48 0.28 5)",
    greeting: "Happy Valentine's Day!",
    wikiUrl: "https://en.wikipedia.org/wiki/Valentine%27s_Day",
  },
  "april-fools": {
    shader: "confetti",
    brand: "oklch(0.70 0.25 340)",
    brandLight: "oklch(0.78 0.20 340)",
    brandDark: "oklch(0.55 0.28 340)",
    greeting: "Happy April Fools' Day!",
    wikiUrl: "https://en.wikipedia.org/wiki/April_Fools%27_Day",
    cssClass: "special-april-fools",
  },
  halloween: {
    shader: "spooky",
    brand: "oklch(0.70 0.20 55)",
    brandLight: "oklch(0.65 0.18 310)",
    brandDark: "oklch(0.55 0.22 45)",
    greeting: "Happy Halloween!",
    wikiUrl: "https://en.wikipedia.org/wiki/Halloween",
    cssClass: "special-halloween",
  },
  "day-of-dead": {
    shader: "spooky",
    brand: "oklch(0.65 0.22 320)",
    brandLight: "oklch(0.72 0.18 55)",
    brandDark: "oklch(0.50 0.25 310)",
    greeting: "Day of the Dead",
    wikiUrl: "https://en.wikipedia.org/wiki/Day_of_the_Dead",
  },
  diwali: {
    shader: "lights",
    brand: "oklch(0.70 0.20 55)",
    brandLight: "oklch(0.80 0.15 40)",
    brandDark: "oklch(0.55 0.22 65)",
    greeting: "Happy Diwali!",
    wikiUrl: "https://en.wikipedia.org/wiki/Diwali",
  },
  christmas: {
    shader: "snow",
    brand: "oklch(0.55 0.22 27)",
    brandLight: "oklch(0.58 0.17 145)",
    brandDark: "oklch(0.42 0.25 27)",
    greeting: "Merry Christmas!",
    wikiUrl: "https://en.wikipedia.org/wiki/Christmas",
  },
  easter: {
    shader: "eggs",
    brand: "oklch(0.72 0.12 300)",
    brandLight: "oklch(0.82 0.10 340)",
    brandDark: "oklch(0.60 0.15 280)",
    greeting: "Happy Easter!",
    wikiUrl: "https://en.wikipedia.org/wiki/Easter",
  },
  "st-patricks": {
    shader: "clovers",
    brand: "oklch(0.55 0.20 145)",
    brandLight: "oklch(0.65 0.17 145)",
    brandDark: "oklch(0.42 0.22 145)",
    greeting: "Happy St. Patrick's Day!",
    wikiUrl: "https://en.wikipedia.org/wiki/Saint_Patrick%27s_Day",
  },
  "earth-day": {
    shader: "leaves",
    brand: "oklch(0.55 0.15 165)",
    brandLight: "oklch(0.65 0.12 165)",
    brandDark: "oklch(0.42 0.18 165)",
    greeting: "Happy Earth Day!",
    wikiUrl: "https://en.wikipedia.org/wiki/Earth_Day",
  },
};

const specialDayCssClasses = Object.values(themes)
  .map((t) => t.cssClass)
  .filter((c): c is string => c != null);

/** Computes Easter Sunday for a given year using the Anonymous Gregorian algorithm. */
function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/** Lunar New Year date lookup — accurate for 2024-2035. */
function getLunarNewYearDate(year: number): Date {
  const dates: Record<number, [number, number]> = {
    2024: [1, 10],
    2025: [0, 29],
    2026: [1, 17],
    2027: [1, 6],
    2028: [0, 26],
    2029: [1, 13],
    2030: [1, 3],
    2031: [0, 23],
    2032: [1, 11],
    2033: [0, 31],
    2034: [1, 19],
    2035: [1, 8],
  };
  const entry = dates[year];
  return entry ? new Date(year, entry[0], entry[1]) : new Date(year, 0, 29);
}

/** Carnival (Mardi Gras) = 47 days before Easter Sunday. */
function getCarnivalDate(year: number): Date {
  const easter = getEasterDate(year);
  return new Date(easter.getTime() - 47 * 86_400_000);
}

/** Approximate Diwali date lookup — accurate for 2024-2035. */
function getDiwaliDate(year: number): Date {
  const dates: Record<number, [number, number]> = {
    2024: [10, 1],
    2025: [9, 20],
    2026: [10, 8],
    2027: [9, 29],
    2028: [9, 17],
    2029: [10, 5],
    2030: [9, 26],
    2031: [10, 14],
    2032: [10, 2],
    2033: [9, 22],
    2034: [10, 11],
    2035: [9, 30],
  };
  const entry = dates[year];
  return entry ? new Date(year, entry[0], entry[1]) : new Date(year, 9, 28);
}

function detectSpecialDay(date: Date): SpecialDayName | null {
  const month = date.getMonth();
  const day = date.getDate();
  const year = date.getFullYear();

  // Fixed dates (checked in calendar order)
  if (month === 0 && day === 1) return "new-year";
  if (month === 0 && day === 16) return "birthday";
  if (month === 1 && day === 14) return "valentines";
  if (month === 2 && day === 17) return "st-patricks";
  if (month === 3 && day === 1) return "april-fools";
  if (month === 3 && day === 22) return "earth-day";
  if (month === 3 && day === 27) return "kingsday";
  if (month === 4 && day === 5) return "liberation-day";
  if (month === 9 && day === 31) return "halloween";
  if (month === 10 && (day === 1 || day === 2)) return "day-of-dead";
  if (month === 11 && day >= 24 && day <= 26) return "christmas";

  // Variable dates
  const dateTime = new Date(year, month, day).getTime();

  const lunarNY = getLunarNewYearDate(year);
  if (Math.abs(dateTime - lunarNY.getTime()) <= 86_400_000) return "lunar-new-year";

  const carnival = getCarnivalDate(year);
  if (Math.abs(dateTime - carnival.getTime()) <= 86_400_000) return "carnival";

  const easter = getEasterDate(year);
  if (Math.abs(dateTime - easter.getTime()) <= 86_400_000) return "easter";

  const diwali = getDiwaliDate(year);
  if (Math.abs(dateTime - diwali.getTime()) <= 86_400_000) return "diwali";

  return null;
}

/**
 * Detects special calendar days and provides theme overrides.
 *
 * Automatically detects holidays and applies themed shader + brand color
 * overrides. Supports both fixed dates (Christmas, Halloween, Valentine's,
 * etc.) and variable dates (Easter, Diwali). Pride month covers all of June.
 * Exposes an override signal for dev-mode testing of any special day theme.
 */
@Injectable({ providedIn: "root" })
export class SpecialDayService {
  private readonly document = inject(DOCUMENT);
  private readonly route = inject(ActivatedRoute);

  readonly detectedDay = detectSpecialDay(new Date());

  /** Query param ?special=... latched for the session — survives navigation. */
  private readonly queryOverride = signal<SpecialDayName | "none" | null>(null);

  private readonly queryParam = toSignal(
    this.route.queryParamMap.pipe(
      map((params) => {
        const param = params.get("special")?.toLowerCase();
        if (!param) return null;
        if (param === "none") return "none" as const;
        return queryAliases[param] ?? null;
      }),
    ),
    { initialValue: null },
  );

  /** Dev-mode override from the settings drawer. */
  readonly devOverride = signal<SpecialDayName | "none" | null>(null);

  readonly effectiveDay = computed<SpecialDayName | null>(() => {
    // Dev override takes priority, then query param, then auto-detect
    const dev = this.devOverride();
    if (dev === "none") return null;
    if (dev !== null) return dev;
    const query = this.queryOverride();
    if (query === "none") return null;
    if (query !== null) return query;
    return this.detectedDay;
  });

  readonly theme = computed(() => {
    const day = this.effectiveDay();
    return day ? themes[day] : null;
  });

  readonly availableDays: readonly { value: SpecialDayName; label: string }[] = [
    { value: "new-year", label: "NYE" },
    { value: "lunar-new-year", label: "Lunar" },
    { value: "birthday", label: "B-day" },
    { value: "carnival", label: "Carn." },
    { value: "valentines", label: "Val." },
    { value: "st-patricks", label: "StPat" },
    { value: "april-fools", label: "Fools" },
    { value: "earth-day", label: "Earth" },
    { value: "kingsday", label: "King's" },
    { value: "liberation-day", label: "Lib." },
    { value: "easter", label: "Easter" },
    { value: "halloween", label: "Hween" },
    { value: "day-of-dead", label: "DotD" },
    { value: "diwali", label: "Diwali" },
    { value: "christmas", label: "Xmas" },
  ];

  constructor() {
    // Latch query param: once ?special= is seen, persist it for the session.
    // Only a new ?special= value or a hard refresh resets it.
    effect(() => {
      const param = this.queryParam();
      if (param !== null) this.queryOverride.set(param);
    });

    effect(() => {
      const theme = this.theme();
      const el = this.document.documentElement;

      // Brand color overrides
      if (theme) {
        el.style.setProperty("--color-brand", theme.brand);
        el.style.setProperty("--color-brand-light", theme.brandLight);
        el.style.setProperty("--color-brand-dark", theme.brandDark);
      } else {
        el.style.removeProperty("--color-brand");
        el.style.removeProperty("--color-brand-light");
        el.style.removeProperty("--color-brand-dark");
      }

      // Special day CSS classes
      for (const cls of specialDayCssClasses) {
        el.classList.toggle(cls, cls === theme?.cssClass);
      }
    });
  }
}
