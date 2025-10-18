import { ThemeModule, EffectDescriptor, ThemeEvent, ThemeContext } from '../../types/theme';
import {
  createStandardIntensities,
  buildTaskCompleteEffect,
  buildBranchCompleteEffect,
  createSoundEffect,
} from '../helpers';

const manifest = {
  id: 'minimal',
  name: 'Minimal',
  version: '1.0.0',
  author: 'Todo App Team',
  description: 'Clean, subtle animations with minimal distraction',
  compatibleAppRange: '^1.0.0',
  tokensCssHref: '/themes/minimal/tokens.css',
  intensities: createStandardIntensities({
    // Minimal theme has more subtle motion and fewer particles
    minimal: { motionScale: 0.3, particles: 0, sound: 'off' },
    standard: { motionScale: 0.7, particles: 3, sound: 'subtle', haptics: 'light' },
    extra: { motionScale: 1, particles: 6, sound: 'normal', haptics: 'medium', pointsMultiplier: 1 },
  }),
  contributes: {
    effects: ['task:complete', 'task:create', 'branch:complete'],
    sounds: {
      tick: '/sounds/tick.mp3',
      success: '/sounds/success.mp3',
    },
    assets: {},
  },
} as const;

const minimalTheme: ThemeModule = {
  manifest,

  install: async (services) => {
    services.log?.('Installing Minimal theme');

    // Preload sounds
    const sounds = manifest.contributes.sounds;
    for (const [id, url] of Object.entries(sounds)) {
      try {
        await services.preloadSound?.(id, url);
      } catch (err) {
        console.warn(`Failed to preload sound ${id}:`, err);
      }
    }
  },

  uninstall: () => {
    console.log('Uninstalling Minimal theme');
  },

  getEffects: (event: ThemeEvent, ctx: ThemeContext): EffectDescriptor | void => {
    const cfg = manifest.intensities[ctx.intensity];

    // If animations are disabled or intensity is 'none', return nothing
    if (!ctx.animations || ctx.intensity === 'none') return;

    switch (event.type) {
      case 'task:complete': {
        return buildTaskCompleteEffect(event, ctx, cfg, {
          particleKind: 'sparkles',
          soundId: 'tick',
          colors: ['#10b981', '#34d399'],
          animationDuration: 300,
        });
      }

      case 'branch:complete': {
        const effects: EffectDescriptor = {};

        if (ctx.sounds) {
          effects.sound = createSoundEffect('success', cfg.sound, 'medium');
        }

        if (ctx.haptics && cfg.haptics !== 'off') {
          effects.haptics = { pattern: 'light' };
        }

        effects.points = {
          delta: 25 * cfg.pointsMultiplier,
          reason: 'branch-complete',
        };

        return effects;
      }

      case 'task:create': {
        // Minimal theme doesn't animate task creation
        return;
      }

      default:
        return;
    }
  },
};

export default minimalTheme;
