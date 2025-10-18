import { SoundEffect, IntensityConfig } from '../../types/theme';

/**
 * Create a sound effect with appropriate volume based on settings
 * Returns undefined if sound is off
 */
export const createSoundEffect = (
  id: string,
  soundLevel: IntensityConfig['sound'],
  importance: 'low' | 'medium' | 'high' = 'medium'
): SoundEffect | undefined => {
  if (soundLevel === 'off') return undefined;

  const volumeMap: Record<Exclude<IntensityConfig['sound'], 'off'>, Record<string, number>> = {
    subtle: { low: 0.2, medium: 0.3, high: 0.4 },
    normal: { low: 0.4, medium: 0.5, high: 0.6 },
    rich: { low: 0.6, medium: 0.7, high: 0.8 },
  };

  return {
    id,
    volume: volumeMap[soundLevel][importance],
  };
};
