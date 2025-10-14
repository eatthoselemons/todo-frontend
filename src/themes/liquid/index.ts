import { ThemeModule, EffectDescriptor, ThemeEvent, ThemeContext } from '../../types/theme';
import {
  createStandardIntensities,
  buildTaskCompleteEffect,
  buildBranchCompleteEffect,
  createSoundEffect,
} from '../helpers';

const manifest = {
  id: 'liquid',
  name: 'Liquid',
  version: '1.0.0',
  author: 'Todo App Team',
  description: 'Fluid, water-inspired animations with waves and bubbles',
  compatibleAppRange: '^1.0.0',
  tokensCssHref: '/themes/liquid/tokens.css',
  intensities: createStandardIntensities({
    // Liquid theme has slightly more particles
    minimal: { particles: 8 },
    standard: { particles: 15 },
    extra: { particles: 30 },
  }),
  contributes: {
    effects: ['task:complete', 'task:create', 'branch:complete', 'milestone'],
    sounds: {
      splash: '/sounds/splash.mp3',
      bubble: '/sounds/bubble.mp3',
      chime: '/sounds/chime.mp3',
    },
    assets: {
      bubbleSprite: '/assets/bubble.png',
    },
  },
} as const;

const liquidTheme: ThemeModule = {
  manifest,

  install: async (services) => {
    services.log?.('Installing Liquid theme');

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
    console.log('Uninstalling Liquid theme');
  },

  getEffects: (event: ThemeEvent, ctx: ThemeContext): EffectDescriptor | void => {
    const cfg = manifest.intensities[ctx.intensity];

    // If animations are disabled or intensity is 'none', return nothing
    if (!ctx.animations || ctx.intensity === 'none') return;

    switch (event.type) {
      case 'task:complete': {
        return buildTaskCompleteEffect(event, ctx, cfg, {
          particleKind: 'bubbles',
          soundId: event.isRoot ? 'splash' : 'bubble',
          colors: ['#6366f1', '#8b5cf6', '#34d399'],
        });
      }

      case 'branch:complete': {
        return buildBranchCompleteEffect(event, ctx, cfg, {
          soundId: 'chime',
          animationKind: 'liquidFill',
        });
      }

      case 'milestone': {
        const effects: EffectDescriptor = {
          animations: [
            {
              target: 'body',
              kind: 'celebrationSplash',
              params: { label: event.label, value: event.value },
              durationMs: 1500,
            },
          ],
        };

        if (cfg.particles > 0) {
          effects.particles = [
            {
              kind: 'confetti',
              count: cfg.particles * 2,
              colorSet: ['#6366f1', '#8b5cf6', '#34d399', '#fbbf24'],
            },
          ];
        }

        if (ctx.sounds) {
          effects.sound = createSoundEffect('chime', cfg.sound, 'high');
        }

        if (ctx.haptics && cfg.haptics !== 'off') {
          effects.haptics = { pattern: [50, 50, 50] };
        }

        effects.points = {
          delta: 100 * cfg.pointsMultiplier,
          reason: 'milestone',
        };

        return effects;
      }

      case 'task:create': {
        const effects: EffectDescriptor = {
          animations: [
            {
              target: `task:${event.taskId}`,
              kind: 'rise',
              durationMs: 300,
            },
          ],
        };

        return effects;
      }

      default:
        return;
    }
  },
};

export default liquidTheme;
