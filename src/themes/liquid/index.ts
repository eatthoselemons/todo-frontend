import { ThemeModule, EffectDescriptor, ThemeEvent, ThemeContext } from '../../types/theme';

const manifest = {
  id: 'liquid',
  name: 'Liquid',
  version: '1.0.0',
  author: 'Todo App Team',
  description: 'Fluid, water-inspired animations with waves and bubbles',
  compatibleAppRange: '^1.0.0',
  tokensCssHref: '/themes/liquid/tokens.css',
  intensities: {
    none: {
      motionScale: 0,
      particles: 0,
      sound: 'off' as const,
      haptics: 'off' as const,
      pointsMultiplier: 1,
    },
    minimal: {
      motionScale: 0.5,
      particles: 5,
      sound: 'subtle' as const,
      haptics: 'light' as const,
      pointsMultiplier: 1,
    },
    standard: {
      motionScale: 1,
      particles: 12,
      sound: 'normal' as const,
      haptics: 'medium' as const,
      pointsMultiplier: 1,
    },
    extra: {
      motionScale: 1.5,
      particles: 25,
      sound: 'rich' as const,
      haptics: 'strong' as const,
      pointsMultiplier: 2,
    },
  },
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
        const effects: EffectDescriptor = {
          animations: [
            {
              target: `task:${event.taskId}`,
              kind: 'burst',
              params: { scale: cfg.motionScale },
              durationMs: 400,
            },
          ],
        };

        // Add particles for minimal and above
        if (cfg.particles > 0) {
          effects.particles = [
            {
              kind: 'bubbles',
              count: cfg.particles,
              origin: event.clientPos,
              colorSet: ['#6366f1', '#8b5cf6', '#34d399'],
            },
          ];
        }

        // Add sound if enabled
        if (ctx.sounds && cfg.sound !== 'off') {
          effects.sound = {
            id: event.isRoot ? 'splash' : 'bubble',
            volume: cfg.sound === 'subtle' ? 0.3 : cfg.sound === 'rich' ? 0.7 : 0.5,
          };
        }

        // Add haptics if enabled
        if (ctx.haptics && cfg.haptics !== 'off') {
          effects.haptics = { pattern: cfg.haptics };
        }

        // Add points
        effects.points = {
          delta: (event.isRoot ? 50 : 10) * cfg.pointsMultiplier,
          reason: 'complete',
        };

        return effects;
      }

      case 'branch:complete': {
        const effects: EffectDescriptor = {
          animations: [
            {
              target: `task:${event.taskId}`,
              kind: 'liquidFill',
              params: { scale: cfg.motionScale },
              durationMs: 800,
            },
          ],
        };

        if (ctx.sounds && cfg.sound !== 'off') {
          effects.sound = {
            id: 'chime',
            volume: 0.6,
          };
        }

        if (ctx.haptics && cfg.haptics !== 'off') {
          effects.haptics = { pattern: 'medium' };
        }

        effects.points = {
          delta: 25 * cfg.pointsMultiplier,
          reason: 'branch-complete',
        };

        return effects;
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

        if (ctx.sounds && cfg.sound !== 'off') {
          effects.sound = {
            id: 'chime',
            volume: 0.8,
          };
        }

        if (ctx.haptics && cfg.haptics !== 'off') {
          effects.haptics = { pattern: [50, 50, 50] };
        }

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
