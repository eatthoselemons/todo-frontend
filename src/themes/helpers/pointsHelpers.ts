import { PointsEffect, ThemeEvent } from '../../types/theme';

/**
 * Calculate points for an event with optional multiplier
 * Centralizes point calculation logic
 */
export const calculatePoints = (
  eventType: ThemeEvent['type'],
  isRoot: boolean = false,
  multiplier: number = 1
): PointsEffect => {
  const basePoints: Record<string, number> = {
    'task:complete': isRoot ? 50 : 10,
    'branch:complete': 25,
    'milestone': 100,
    'task:create': 0,
    'task:delete': 0,
    'idle': 0,
  };

  return {
    delta: (basePoints[eventType] || 0) * multiplier,
    reason: eventType,
  };
};
