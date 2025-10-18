import { Intensity, IntensityConfig } from '../../types/theme';

/**
 * Create standard intensity configurations with optional overrides
 * This provides sensible defaults that themes can customize
 */
export const createStandardIntensities = (
  overrides?: Partial<Record<Intensity, Partial<IntensityConfig>>>
): Record<Intensity, IntensityConfig> => {
  const defaults: Record<Intensity, IntensityConfig> = {
    none: {
      motionScale: 0,
      particles: 0,
      sound: 'off',
      haptics: 'off',
      pointsMultiplier: 1,
    },
    minimal: {
      motionScale: 0.5,
      particles: 5,
      sound: 'subtle',
      haptics: 'light',
      pointsMultiplier: 1,
    },
    standard: {
      motionScale: 1,
      particles: 12,
      sound: 'normal',
      haptics: 'medium',
      pointsMultiplier: 1,
    },
    extra: {
      motionScale: 1.5,
      particles: 25,
      sound: 'rich',
      haptics: 'strong',
      pointsMultiplier: 2,
    },
  };

  if (!overrides) return defaults;

  return Object.entries(defaults).reduce((acc, [key, value]) => {
    acc[key as Intensity] = { ...value, ...overrides[key as Intensity] };
    return acc;
  }, {} as Record<Intensity, IntensityConfig>);
};
