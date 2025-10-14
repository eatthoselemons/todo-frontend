import { themeEventBus } from '../ThemeEventBus';

describe('ThemeEventBus', () => {
  beforeEach(() => {
    // Clear all listeners before each test
    themeEventBus.clearListeners();
  });

  afterEach(() => {
    themeEventBus.clearListeners();
  });

  describe('emit and on', () => {
    it('should emit and receive events (happy path)', async () => {
      const handler = jest.fn();
      themeEventBus.on('task:complete', handler);

      await themeEventBus.emit('task:complete', { taskId: 'task-123' });

      expect(handler).toHaveBeenCalledWith({ taskId: 'task-123' });
    });

    it('should handle multiple listeners for same event', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      themeEventBus.on('task:complete', handler1);
      themeEventBus.on('task:complete', handler2);

      await themeEventBus.emit('task:complete', { taskId: 'task-123' });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should support async handlers', async () => {
      const results: string[] = [];
      const handler = jest.fn(async (data) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        results.push(data.taskId);
      });

      themeEventBus.on('task:complete', handler);

      await themeEventBus.emit('task:complete', { taskId: 'task-1' });
      await themeEventBus.emit('task:complete', { taskId: 'task-2' });

      expect(results).toEqual(['task-1', 'task-2']);
    });

    it('should be type-safe with event data', async () => {
      const handler = jest.fn();
      themeEventBus.on('milestone', handler);

      await themeEventBus.emit('milestone', { label: 'Level 5', value: 100 });

      expect(handler).toHaveBeenCalledWith({ label: 'Level 5', value: 100 });
    });
  });

  describe('emitSync', () => {
    it('should emit without blocking (happy path)', () => {
      const handler = jest.fn();
      themeEventBus.on('task:create', handler);

      themeEventBus.emitSync('task:create', { taskId: 'new-task' });

      // Handler not called immediately
      expect(handler).not.toHaveBeenCalled();
    });

    it('should eventually call handlers', async () => {
      const handler = jest.fn();
      themeEventBus.on('task:create', handler);

      themeEventBus.emitSync('task:create', { taskId: 'new-task' });

      // Wait for next tick
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(handler).toHaveBeenCalledWith({ taskId: 'new-task' });
    });

    it('should catch and log errors in handlers', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const handler = jest.fn(() => {
        throw new Error('Handler error');
      });

      themeEventBus.on('task:delete', handler);
      themeEventBus.emitSync('task:delete', { taskId: 'task-123' });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('once', () => {
    it('should resolve on next emission (happy path)', async () => {
      const promise = themeEventBus.once('branch:complete');

      setTimeout(() => {
        themeEventBus.emit('branch:complete', { taskId: 'branch-1' });
      }, 10);

      const data = await promise;
      expect(data).toEqual({ taskId: 'branch-1' });
    });

    it('should only trigger once', async () => {
      const handler = jest.fn();
      themeEventBus.once('task:complete').then(handler);

      await themeEventBus.emit('task:complete', { taskId: 'task-1' });
      await themeEventBus.emit('task:complete', { taskId: 'task-2' });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('onAny', () => {
    it('should listen to all event types (happy path)', async () => {
      const handler = jest.fn();
      themeEventBus.onAny(handler);

      await themeEventBus.emit('task:complete', { taskId: 'task-1' });
      await themeEventBus.emit('milestone', { label: 'Level 2', value: 50 });

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledWith('task:complete', { taskId: 'task-1' });
      expect(handler).toHaveBeenCalledWith('milestone', { label: 'Level 2', value: 50 });
    });

    it('should filter events by type in handler', async () => {
      const taskEvents: string[] = [];
      const handler = jest.fn((eventType, data) => {
        if (eventType === 'task:complete') {
          taskEvents.push(data.taskId);
        }
      });

      themeEventBus.onAny(handler);

      await themeEventBus.emit('task:complete', { taskId: 'task-1' });
      await themeEventBus.emit('milestone', { label: 'Test', value: 10 });
      await themeEventBus.emit('task:complete', { taskId: 'task-2' });

      expect(taskEvents).toEqual(['task-1', 'task-2']);
    });
  });

  describe('off', () => {
    it('should remove specific listener (happy path)', async () => {
      const handler = jest.fn();
      themeEventBus.on('task:complete', handler);

      await themeEventBus.emit('task:complete', { taskId: 'task-1' });
      expect(handler).toHaveBeenCalledTimes(1);

      themeEventBus.off('task:complete', handler);

      await themeEventBus.emit('task:complete', { taskId: 'task-2' });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should only remove specified handler', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      themeEventBus.on('task:complete', handler1);
      themeEventBus.on('task:complete', handler2);

      themeEventBus.off('task:complete', handler1);

      await themeEventBus.emit('task:complete', { taskId: 'task-1' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('clearListeners', () => {
    it('should clear all listeners for an event type', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      themeEventBus.on('task:complete', handler1);
      themeEventBus.on('task:complete', handler2);

      themeEventBus.clearListeners('task:complete');

      await themeEventBus.emit('task:complete', { taskId: 'task-1' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should clear all listeners when no event type specified', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      themeEventBus.on('task:complete', handler1);
      themeEventBus.on('milestone', handler2);

      themeEventBus.clearListeners();

      await themeEventBus.emit('task:complete', { taskId: 'task-1' });
      await themeEventBus.emit('milestone', { label: 'Test', value: 10 });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('listenerCount', () => {
    it('should return correct listener count (happy path)', () => {
      expect(themeEventBus.listenerCount('task:complete')).toBe(0);

      themeEventBus.on('task:complete', jest.fn());
      expect(themeEventBus.listenerCount('task:complete')).toBe(1);

      themeEventBus.on('task:complete', jest.fn());
      expect(themeEventBus.listenerCount('task:complete')).toBe(2);
    });

    it('should return total listener count without event type', () => {
      themeEventBus.on('task:complete', jest.fn());
      themeEventBus.on('milestone', jest.fn());

      expect(themeEventBus.listenerCount()).toBeGreaterThanOrEqual(2);
    });
  });

  describe('waitFor', () => {
    it('should wait for next event emission (happy path)', async () => {
      setTimeout(() => {
        themeEventBus.emit('task:complete', { taskId: 'task-waiting' });
      }, 50);

      const data = await themeEventBus.waitFor('task:complete');
      expect(data.taskId).toBe('task-waiting');
    });

    it('should timeout if event not emitted', async () => {
      await expect(
        themeEventBus.waitFor('task:complete', { timeout: 50 })
      ).rejects.toThrow('Timeout waiting for task:complete');
    });

    it('should filter events', async () => {
      setTimeout(() => {
        themeEventBus.emit('task:complete', { taskId: 'task-1' });
        themeEventBus.emit('task:complete', { taskId: 'task-2', isRoot: true });
      }, 10);

      const data = await themeEventBus.waitFor('task:complete', {
        filter: (d) => d.isRoot === true,
      });

      expect(data.taskId).toBe('task-2');
    });

    it('should work with timeout and filter together', async () => {
      setTimeout(() => {
        themeEventBus.emit('task:complete', { taskId: 'task-1' });
      }, 10);

      await expect(
        themeEventBus.waitFor('task:complete', {
          timeout: 100,
          filter: (d) => d.taskId === 'never-matches',
        })
      ).rejects.toThrow('Timeout');
    });
  });

  describe('toThemeEvent', () => {
    it('should convert to ThemeEvent format', () => {
      const themeEvent = themeEventBus.toThemeEvent('task:complete', {
        taskId: 'task-123',
        isRoot: true,
      });

      expect(themeEvent).toEqual({
        type: 'task:complete',
        taskId: 'task-123',
        isRoot: true,
      });
    });

    it('should preserve all properties', () => {
      const themeEvent = themeEventBus.toThemeEvent('milestone', {
        label: 'Achievement',
        value: 100,
      });

      expect(themeEvent.type).toBe('milestone');
      // Type narrowing ensures we can access milestone-specific properties
      if (themeEvent.type === 'milestone') {
        expect(themeEvent.label).toBe('Achievement');
        expect(themeEvent.value).toBe(100);
      }
    });
  });

  describe('unsubscribe pattern', () => {
    it('should support unsubscribe function (happy path)', async () => {
      const handler = jest.fn();
      const unsubscribe = themeEventBus.on('task:complete', handler);

      await themeEventBus.emit('task:complete', { taskId: 'task-1' });
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();

      await themeEventBus.emit('task:complete', { taskId: 'task-2' });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple unsubscribes safely', () => {
      const handler = jest.fn();
      const unsubscribe = themeEventBus.on('task:complete', handler);

      unsubscribe();
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle emitting to event with no listeners', async () => {
      await expect(
        themeEventBus.emit('task:complete', { taskId: 'task-1' })
      ).resolves.not.toThrow();
    });

    it('should handle errors in handlers gracefully', async () => {
      const goodHandler = jest.fn();
      const badHandler = jest.fn(() => {
        throw new Error('Handler error');
      });

      themeEventBus.on('task:complete', badHandler);
      themeEventBus.on('task:complete', goodHandler);

      await expect(
        themeEventBus.emit('task:complete', { taskId: 'task-1' })
      ).rejects.toThrow('Handler error');

      // First handler threw, but we still attempted
      expect(badHandler).toHaveBeenCalled();
    });
  });
});
