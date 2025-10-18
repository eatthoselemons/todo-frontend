import minimalTheme from '../minimal';
import { ThemeContext, TaskCompleteEvent } from '../../types/theme';

describe('Minimal Theme', () => {
  const baseContext: ThemeContext = {
    intensity: 'standard',
    animations: true,
    sounds: true,
    haptics: true,
    userSettings: {},
  };

  it('has valid manifest', () => {
    expect(minimalTheme.manifest.id).toBe('minimal');
    expect(minimalTheme.manifest.name).toBe('Minimal');
  });

  it('returns effects for task completion at standard (happy path)', () => {
    const event: TaskCompleteEvent = { type: 'task:complete', taskId: 't1' };
    const effects = minimalTheme.getEffects?.(event, baseContext);
    expect(effects).toBeDefined();
    const e = effects as any;
    expect(e.animations?.length).toBeGreaterThan(0);
  });

  it('returns nothing when animations disabled (edge case)', () => {
    const event: TaskCompleteEvent = { type: 'task:complete', taskId: 't1' };
    const ctx: ThemeContext = { ...baseContext, animations: false };
    const effects = minimalTheme.getEffects?.(event, ctx);
    expect(effects).toBeUndefined();
  });

  it('returns nothing for intensity "none" (edge case)', () => {
    const event: TaskCompleteEvent = { type: 'task:complete', taskId: 't1' };
    const ctx: ThemeContext = { ...baseContext, intensity: 'none' };
    const effects = minimalTheme.getEffects?.(event, ctx);
    expect(effects).toBeUndefined();
  });
});
