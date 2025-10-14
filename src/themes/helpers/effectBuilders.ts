import {
  EffectDescriptor,
  TaskCompleteEvent,
  BranchCompleteEvent,
  ThemeContext,
  IntensityConfig,
  ParticleEffect,
} from '../../types/theme';
import { createSoundEffect } from './soundHelpers';
import { calculatePoints } from './pointsHelpers';

interface TaskCompleteEffectOptions {
  particleKind?: ParticleEffect['kind'];
  soundId?: string;
  colors?: string[];
  animationDuration?: number;
}

/**
 * Build a complete effect descriptor for task completion
 * Handles animations, particles, sound, haptics, and points
 */
export const buildTaskCompleteEffect = (
  event: TaskCompleteEvent,
  ctx: ThemeContext,
  config: IntensityConfig,
  options: TaskCompleteEffectOptions = {}
): EffectDescriptor => {
  const {
    particleKind = 'sparkles',
    soundId,
    colors = ['#6366f1', '#8b5cf6', '#34d399'],
    animationDuration = 400,
  } = options;

  const effect: EffectDescriptor = {};

  // Add particles if enabled
  if (config.particles > 0) {
    effect.particles = [{
      kind: particleKind,
      count: config.particles,
      origin: event.clientPos,
      colorSet: colors,
    } as ParticleEffect];
  }

  // Add sound if enabled and provided
  if (ctx.sounds && soundId) {
    effect.sound = createSoundEffect(
      soundId,
      config.sound,
      event.isRoot ? 'high' : 'medium'
    );
  }

  // Add haptics if enabled
  if (ctx.haptics && config.haptics !== 'off') {
    effect.haptics = { pattern: config.haptics };
  }

  // Calculate points
  effect.points = calculatePoints('task:complete', event.isRoot, config.pointsMultiplier);

  return effect;
};

interface BranchCompleteEffectOptions {
  soundId?: string;
  animationKind?: 'liquidFill' | 'burst' | 'shake';
  animationDuration?: number;
}

/**
 * Build a complete effect descriptor for branch completion
 */
export const buildBranchCompleteEffect = (
  event: BranchCompleteEvent,
  ctx: ThemeContext,
  config: IntensityConfig,
  options: BranchCompleteEffectOptions = {}
): EffectDescriptor => {
  const {
    soundId,
    animationKind = 'liquidFill',
    animationDuration = 800,
  } = options;

  const effect: EffectDescriptor = {
    animations: [{
      target: `task:${event.taskId}`,
      kind: animationKind,
      params: { scale: config.motionScale },
      durationMs: animationDuration,
    }],
  };

  if (ctx.sounds && soundId) {
    effect.sound = createSoundEffect(soundId, config.sound, 'high');
  }

  if (ctx.haptics && config.haptics !== 'off') {
    effect.haptics = { pattern: 'medium' };
  }

  effect.points = calculatePoints('branch:complete', false, config.pointsMultiplier);

  return effect;
};
