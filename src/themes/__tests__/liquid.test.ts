import liquidTheme from '../liquid';
import { ThemeContext, TaskCompleteEvent, TaskCreateEvent, BranchCompleteEvent, MilestoneEvent, IdleEvent } from '../../types/theme';

describe('Liquid Theme', () => {
  const baseContext: ThemeContext = {
    intensity: 'standard',
    animations: true,
    sounds: true,
    haptics: true,
    userSettings: {},
  };

  describe('manifest', () => {
    it('should have valid manifest structure (happy path)', () => {
      expect(liquidTheme.manifest).toBeDefined();
      expect(liquidTheme.manifest.id).toBe('liquid');
      expect(liquidTheme.manifest.name).toBe('Liquid');
      expect(liquidTheme.manifest.version).toBeDefined();
    });

    it('should have all intensity levels defined', () => {
      const intensities = liquidTheme.manifest.intensities;

      expect(intensities.none).toBeDefined();
      expect(intensities.minimal).toBeDefined();
      expect(intensities.standard).toBeDefined();
      expect(intensities.extra).toBeDefined();
    });

    it('should have valid intensity configurations', () => {
      const standard = liquidTheme.manifest.intensities.standard;

      expect(standard.motionScale).toBeGreaterThanOrEqual(0);
      expect(standard.particles).toBeGreaterThanOrEqual(0);
      expect(['off', 'subtle', 'normal', 'rich']).toContain(standard.sound);
      expect(['off', 'light', 'medium', 'strong']).toContain(standard.haptics);
      expect(standard.pointsMultiplier).toBeGreaterThan(0);
    });

    it('should have contributes section with sounds', () => {
      expect(liquidTheme.manifest.contributes?.sounds).toBeDefined();
      expect(Object.keys(liquidTheme.manifest.contributes!.sounds!).length).toBeGreaterThan(0);
    });
  });

  describe('install hook', () => {
    it('should preload sounds during installation (happy path)', async () => {
      const mockServices = {
        preloadSound: jest.fn().mockResolvedValue(undefined),
        preloadImage: jest.fn().mockResolvedValue(undefined),
        log: jest.fn(),
      };

      await liquidTheme.install?.(mockServices);

      expect(mockServices.preloadSound).toHaveBeenCalled();
      expect(mockServices.log).toHaveBeenCalledWith('Installing Liquid theme');
    });

    it('should handle preload failures gracefully', async () => {
      const mockServices = {
        preloadSound: jest.fn().mockRejectedValue(new Error('Failed')),
        log: jest.fn(),
      };

      await expect(liquidTheme.install?.(mockServices)).resolves.not.toThrow();
    });
  });

  describe('getEffects - task:complete event', () => {
    it('should return effects for task completion (happy path)', () => {
      const event: TaskCompleteEvent = {
        type: 'task:complete',
        taskId: 'task-123',
        clientPos: { x: 100, y: 200 },
      };

      const effects = liquidTheme.getEffects?.(event, baseContext);

      expect(effects).toBeDefined();
      if (effects) {
        expect(effects.animations).toBeDefined();
        expect(effects.animations?.length).toBeGreaterThan(0);
      }
    });

    it('should include particles for standard intensity', () => {
      const event: TaskCompleteEvent = {
        type: 'task:complete',
        taskId: 'task-123',
      };

      const effects = liquidTheme.getEffects?.(event, baseContext);

      if (effects) {
        expect(effects.particles).toBeDefined();
        expect(effects.particles?.[0].kind).toBe('bubbles');
      }
    });

    it('should return nothing for none intensity (edge case)', () => {
      const event: TaskCompleteEvent = {
        type: 'task:complete',
        taskId: 'task-123',
      };

      const ctx: ThemeContext = {
        ...baseContext,
        intensity: 'none',
      };

      const effects = liquidTheme.getEffects?.(event, ctx);

      expect(effects).toBeUndefined();
    });

    it('should include sound when sounds enabled', () => {
      const event: TaskCompleteEvent = {
        type: 'task:complete',
        taskId: 'task-123',
      };

      const effects = liquidTheme.getEffects?.(event, baseContext);

      if (effects) {
        expect(effects.sound).toBeDefined();
        expect(effects.sound?.id).toBe('bubble');
      }
    });

    it('should not include sound when sounds disabled (edge case)', () => {
      const event: TaskCompleteEvent = {
        type: 'task:complete',
        taskId: 'task-123',
      };

      const ctx: ThemeContext = {
        ...baseContext,
        sounds: false,
      };

      const effects = liquidTheme.getEffects?.(event, ctx);

      if (effects) {
        expect(effects.sound).toBeUndefined();
      }
    });

    it('should use different sound for root task completion', () => {
      const event: TaskCompleteEvent = {
        type: 'task:complete',
        taskId: 'task-123',
        isRoot: true,
      };

      const effects = liquidTheme.getEffects?.(event, baseContext);

      if (effects) {
        expect(effects.sound?.id).toBe('splash');
      }
    });

    it('should include haptics when enabled', () => {
      const event: TaskCompleteEvent = {
        type: 'task:complete',
        taskId: 'task-123',
      };

      const effects = liquidTheme.getEffects?.(event, baseContext);

      if (effects) {
        expect(effects.haptics).toBeDefined();
      }
    });

    it('should not include haptics when disabled', () => {
      const event: TaskCompleteEvent = {
        type: 'task:complete',
        taskId: 'task-123',
      };

      const ctx: ThemeContext = {
        ...baseContext,
        haptics: false,
      };

      const effects = liquidTheme.getEffects?.(event, ctx);

      if (effects) {
        expect(effects.haptics).toBeUndefined();
      }
    });

    it('should award more points for root tasks', () => {
      const regularEvent: TaskCompleteEvent = {
        type: 'task:complete',
        taskId: 'task-1',
      };

      const rootEvent: TaskCompleteEvent = {
        type: 'task:complete',
        taskId: 'task-2',
        isRoot: true,
      };

      const regularEffects = liquidTheme.getEffects?.(regularEvent, baseContext);
      const rootEffects = liquidTheme.getEffects?.(rootEvent, baseContext);

      if (regularEffects && rootEffects) {
        expect(rootEffects.points?.delta).toBeGreaterThan(regularEffects.points?.delta || 0);
      }
    });

    it('should multiply points in extra intensity', () => {
      const event: TaskCompleteEvent = {
        type: 'task:complete',
        taskId: 'task-123',
      };

      const standardCtx: ThemeContext = {
        ...baseContext,
        intensity: 'standard',
      };

      const extraCtx: ThemeContext = {
        ...baseContext,
        intensity: 'extra',
      };

      const standardEffects = liquidTheme.getEffects?.(event, standardCtx);
      const extraEffects = liquidTheme.getEffects?.(event, extraCtx);

      if (standardEffects && extraEffects) {
        expect(extraEffects.points?.delta).toBeGreaterThan(standardEffects.points?.delta || 0);
      }
    });

    it('should return nothing when animations disabled (edge case)', () => {
      const event: TaskCompleteEvent = {
        type: 'task:complete',
        taskId: 'task-123',
      };

      const ctx: ThemeContext = {
        ...baseContext,
        animations: false,
      };

      const effects = liquidTheme.getEffects?.(event, ctx);

      expect(effects).toBeUndefined();
    });
  });

  describe('getEffects - branch:complete event', () => {
    it('should return effects for branch completion (happy path)', () => {
      const event: BranchCompleteEvent = {
        type: 'branch:complete',
        taskId: 'branch-123',
      };

      const effects = liquidTheme.getEffects?.(event, baseContext);

      if (effects) {
        expect(effects.animations).toBeDefined();
        expect(effects.animations?.[0].kind).toBe('liquidFill');
      }
    });

    it('should include sound and haptics for branch completion', () => {
      const event: BranchCompleteEvent = {
        type: 'branch:complete',
        taskId: 'branch-123',
      };

      const effects = liquidTheme.getEffects?.(event, baseContext);

      if (effects) {
        expect(effects.sound?.id).toBe('chime');
        expect(effects.haptics).toBeDefined();
      }
    });

    it('should award medium points for branch completion', () => {
      const event: BranchCompleteEvent = {
        type: 'branch:complete',
        taskId: 'branch-123',
      };

      const effects = liquidTheme.getEffects?.(event, baseContext);

      if (effects) {
        expect(effects.points?.delta).toBe(25);
      }
    });
  });

  describe('getEffects - milestone event', () => {
    it('should return celebration effects for milestones (happy path)', () => {
      const event: MilestoneEvent = {
        type: 'milestone',
        label: 'Level 5!',
        value: 100,
      };

      const effects = liquidTheme.getEffects?.(event, baseContext);

      if (effects) {
        expect(effects.animations).toBeDefined();
        expect(effects.animations?.[0].kind).toBe('celebrationSplash');
      }
    });

    it('should include confetti particles for milestones', () => {
      const event: MilestoneEvent = {
        type: 'milestone',
        label: 'Achievement!',
        value: 50,
      };

      const effects = liquidTheme.getEffects?.(event, baseContext);

      if (effects) {
        expect(effects.particles).toBeDefined();
        expect(effects.particles?.[0].kind).toBe('confetti');
      }
    });

    it('should use pattern haptics for milestones', () => {
      const event: MilestoneEvent = {
        type: 'milestone',
        label: 'Milestone!',
        value: 75,
      };

      const effects = liquidTheme.getEffects?.(event, baseContext);

      if (effects) {
        expect(effects.haptics?.pattern).toEqual([50, 50, 50]);
      }
    });
  });

  describe('getEffects - task:create event', () => {
    it('should return subtle effects for task creation', () => {
      const event: TaskCreateEvent = {
        type: 'task:create',
        taskId: 'new-task',
      };

      const effects = liquidTheme.getEffects?.(event, baseContext);

      if (effects) {
        expect(effects.animations?.[0].kind).toBe('rise');
      }
    });

    it('should not include sound or haptics for task creation (edge case)', () => {
      const event: TaskCreateEvent = {
        type: 'task:create',
        taskId: 'new-task',
      };

      const effects = liquidTheme.getEffects?.(event, baseContext);

      if (effects) {
        expect(effects.sound).toBeUndefined();
        expect(effects.haptics).toBeUndefined();
      }
    });
  });

  describe('getEffects - unknown event', () => {
    it('should return nothing for unknown events (error case)', () => {
      const event: IdleEvent = {
        type: 'idle',
        timestamp: Date.now(),
      };

      const effects = liquidTheme.getEffects?.(event, baseContext);

      expect(effects).toBeUndefined();
    });
  });

  describe('intensity scaling', () => {
    it('should scale particle count by intensity', () => {
      const event: TaskCompleteEvent = {
        type: 'task:complete',
        taskId: 'task-123',
      };

      const minimalCtx: ThemeContext = { ...baseContext, intensity: 'minimal' };
      const extraCtx: ThemeContext = { ...baseContext, intensity: 'extra' };

      const minimalEffects = liquidTheme.getEffects?.(event, minimalCtx);
      const extraEffects = liquidTheme.getEffects?.(event, extraCtx);

      if (minimalEffects && extraEffects) {
        const minimalCount = minimalEffects.particles?.[0]?.count || 0;
        const extraCount = extraEffects.particles?.[0]?.count || 0;
        expect(extraCount).toBeGreaterThan(minimalCount);
      }
    });

    it('should adjust sound volume by intensity', () => {
      const event: TaskCompleteEvent = {
        type: 'task:complete',
        taskId: 'task-123',
      };

      const minimalCtx: ThemeContext = { ...baseContext, intensity: 'minimal' };
      const extraCtx: ThemeContext = { ...baseContext, intensity: 'extra' };

      const minimalEffects = liquidTheme.getEffects?.(event, minimalCtx);
      const extraEffects = liquidTheme.getEffects?.(event, extraCtx);

      if (minimalEffects && extraEffects) {
        const minimalVolume = minimalEffects.sound?.volume || 0;
        const extraVolume = extraEffects.sound?.volume || 0;
        expect(extraVolume).toBeGreaterThanOrEqual(minimalVolume);
      }
    });
  });
});
