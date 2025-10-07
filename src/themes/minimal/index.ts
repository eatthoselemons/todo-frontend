import { ThemeModule, EffectDescriptor, ThemeEvent, ThemeContext } from '../../types/theme';

const manifest = {
  id: 'minimal',
  name: 'Minimal',
  version: '1.0.0',
  author: 'Todo App Team',
  description: 'Clean, subtle animations with minimal distraction',
  compatibleAppRange: '^1.0.0',
  tokensCssHref: '/themes/minimal/tokens.css',
  intensities: {
    none: {
      motionScale: 0,
      particles: 0,
      sound: 'off' as const,
      haptics: 'off' as const,
      pointsMultiplier: 1,
    },
    minimal: {
      motionScale: 0.3,
      particles: 0,
      sound: 'off' as const,
      haptics: 'light' as const,
      pointsMultiplier: 1,
    },
    standard: {
      motionScale: 0.7,
      particles: 3,
      sound: 'subtle' as const,
      haptics: 'light' as const,
      pointsMultiplier: 1,
    },
    extra: {
      motionScale: 1,
      particles: 6,
      sound: 'normal' as const,
      haptics: 'medium' as const,
      pointsMultiplier: 1,
    },
  },
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
        const effects: EffectDescriptor = {
          animations: [
            {
              target: `task:${event.taskId}`,
              kind: 'burst',
              params: { scale: cfg.motionScale * 0.5 }, // More subtle
              durationMs: 300,
            },
          ],
        };

        // Minimal theme has very few particles
        if (cfg.particles > 0) {
          effects.particles = [
            {
              kind: 'sparkles',
              count: cfg.particles,
              origin: event.clientPos,
              colorSet: ['#10b981', '#34d399'],
            },
          ];
        }

        // Subtle sound
        if (ctx.sounds && cfg.sound !== 'off') {
          effects.sound = {
            id: 'tick',
            volume: 0.2,
          };
        }

        // Light haptics
        if (ctx.haptics && cfg.haptics !== 'off') {
          effects.haptics = { pattern: 'light' };
        }

        // Points (no multiplier for minimal theme)
        effects.points = {
          delta: event.isRoot ? 50 : 10,
          reason: 'complete',
        };

        return effects;
      }

      case 'branch:complete': {
        const effects: EffectDescriptor = {};

        if (ctx.sounds && cfg.sound !== 'off') {
          effects.sound = {
            id: 'success',
            volume: 0.3,
          };
        }

        if (ctx.haptics && cfg.haptics !== 'off') {
          effects.haptics = { pattern: 'light' };
        }

        effects.points = {
          delta: 25,
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
