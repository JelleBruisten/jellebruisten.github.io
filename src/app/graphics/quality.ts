export const enum QualityTier {
  Low = 0,
  Medium = 1,
  High = 2,
}

export const enum QualityPreference {
  Auto,
  Low,
  Medium,
  High,
}

/** Canvas resolution multiplier for each quality tier. */
export function qualityScale(tier: QualityTier): number {
  switch (tier) {
    case QualityTier.Low:
      return 0.5;
    case QualityTier.Medium:
      return 0.75;
    case QualityTier.High:
      return 1.0;
  }
}

/** Shader-facing quality value (0 = low, 0.5 = medium, 1 = high). */
export function qualityLevel(tier: QualityTier): number {
  switch (tier) {
    case QualityTier.Low:
      return 0.0;
    case QualityTier.Medium:
      return 0.5;
    case QualityTier.High:
      return 1.0;
  }
}

/** Resolve a user preference to a concrete tier (Auto defaults to High, then adapts). */
export function resolveQuality(preference: QualityPreference): QualityTier {
  switch (preference) {
    case QualityPreference.Low:
      return QualityTier.Low;
    case QualityPreference.Medium:
      return QualityTier.Medium;
    case QualityPreference.High:
      return QualityTier.High;
    case QualityPreference.Auto:
      return QualityTier.High; // start high, auto-detection will downgrade
  }
}
