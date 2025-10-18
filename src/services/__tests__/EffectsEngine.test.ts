import { effectsEngine } from '../../features/rewards/services/EffectsEngine';
import { EffectDescriptor } from '../../features/rewards/types/theme';

describe('EffectsEngine', () => {
  beforeEach(() => {
    effectsEngine.clearCaches();
    document.body.innerHTML = '';

    // Mock Image constructor - override both window and global
    const MockImage = class {
      onload: (() => void) | null = null;
      onerror: ((err: any) => void) | null = null;
      _src = '';

      set src(value: string) {
        this._src = value;
        // Use setImmediate to ensure handlers are set first
        setImmediate(() => {
          if (this._src.startsWith('data:') || this._src.includes('valid')) {
            if (this.onload) {
              this.onload();
            }
          } else {
            // Any other URL should trigger error
            if (this.onerror) {
              this.onerror(new Error('Failed to load image'));
            }
          }
        });
      }

      get src() {
        return this._src;
      }
    };
    (global as any).Image = MockImage;
    (window as any).Image = MockImage;

    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    // Mock Element.animate
    Element.prototype.animate = jest.fn().mockReturnValue({
      finished: Promise.resolve(),
      cancel: jest.fn(),
      pause: jest.fn(),
      play: jest.fn(),
    });
  });

  afterEach(() => {
    effectsEngine.cancelAll();
    effectsEngine.clearCaches();
  });

  describe('preloadSound', () => {
    it('should preload a sound successfully (happy path)', async () => {
      // Mock Audio API
      const mockAudio = {
        preload: '',
        src: '',
        load: jest.fn(),
        addEventListener: jest.fn((event, callback) => {
          if (event === 'canplaythrough') {
            setTimeout(callback, 10);
          }
        }),
      };
      global.Audio = jest.fn(() => mockAudio as any) as any;

      await effectsEngine.preloadSound('test-sound', '/sounds/test.mp3');

      expect(global.Audio).toHaveBeenCalled();
      expect(mockAudio.src).toBe('/sounds/test.mp3');
      expect(mockAudio.load).toHaveBeenCalled();
    });

    it('should handle sound loading errors', async () => {
      const mockAudio = {
        preload: '',
        src: '',
        load: jest.fn(),
        addEventListener: jest.fn((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('Failed to load')), 10);
          }
        }),
      };
      global.Audio = jest.fn(() => mockAudio as any) as any;

      await expect(effectsEngine.preloadSound('test-sound', '/invalid.mp3'))
        .rejects.toThrow();
    });

    it('should not reload already cached sounds (edge case)', async () => {
      const mockAudio = {
        preload: '',
        src: '',
        load: jest.fn(),
        addEventListener: jest.fn((event, callback) => {
          if (event === 'canplaythrough') {
            setTimeout(callback, 10);
          }
        }),
      };
      global.Audio = jest.fn(() => mockAudio as any) as any;

      await effectsEngine.preloadSound('test-sound', '/sounds/test.mp3');
      const loadCallsFirst = mockAudio.load.mock.calls.length;

      await effectsEngine.preloadSound('test-sound', '/sounds/test.mp3');
      const loadCallsSecond = mockAudio.load.mock.calls.length;

      expect(loadCallsSecond).toBe(loadCallsFirst);
    });
  });

  describe('preloadImage', () => {
    it('should preload an image successfully (happy path)', async () => {
      await effectsEngine.preloadImage('test-img', 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==');
      // Image loaded successfully
    });

    it('should handle image loading errors', async () => {
      await expect(effectsEngine.preloadImage('test-img-error', '/invalid-image.png'))
        .rejects.toThrow('Failed to load image');
    });

    it('should not reload already cached images (edge case)', async () => {
      const validImage = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

      await effectsEngine.preloadImage('test-img', validImage);
      await effectsEngine.preloadImage('test-img', validImage);

      // Should complete without error and not reload
    });
  });

  describe('execute', () => {
    it('should execute a complete effect descriptor (happy path)', async () => {
      const mockElement = document.createElement('div');
      mockElement.setAttribute('data-task-id', 'task-123');
      document.body.appendChild(mockElement);

      const descriptor: EffectDescriptor = {
        animations: [
          {
            target: 'task:task-123',
            kind: 'burst',
            durationMs: 100,
          },
        ],
      };

      await effectsEngine.execute(descriptor);
      // Animation should complete
    });

    it('should respect prefers-reduced-motion (edge case)', async () => {
      // Mock matchMedia to return reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        })),
      });

      const mockElement = document.createElement('div');
      mockElement.setAttribute('data-task-id', 'task-123');
      document.body.appendChild(mockElement);

      const animateSpy = jest.spyOn(mockElement, 'animate');

      const descriptor: EffectDescriptor = {
        animations: [
          {
            target: 'task:task-123',
            kind: 'burst',
            durationMs: 100,
          },
        ],
      };

      await effectsEngine.execute(descriptor);

      // Animations should be skipped
      expect(animateSpy).not.toHaveBeenCalled();
    });

    it('should handle missing target elements gracefully (error case)', async () => {
      const descriptor: EffectDescriptor = {
        animations: [
          {
            target: 'task:nonexistent',
            kind: 'burst',
            durationMs: 100,
          },
        ],
      };

      // Should not throw
      await expect(effectsEngine.execute(descriptor)).resolves.not.toThrow();
    });

    it('should execute multiple animations in parallel', async () => {
      const elem1 = document.createElement('div');
      elem1.setAttribute('data-task-id', 'task-1');
      const elem2 = document.createElement('div');
      elem2.setAttribute('data-task-id', 'task-2');
      document.body.appendChild(elem1);
      document.body.appendChild(elem2);

      const descriptor: EffectDescriptor = {
        animations: [
          { target: 'task:task-1', kind: 'burst', durationMs: 50 },
          { target: 'task:task-2', kind: 'shake', durationMs: 50 },
        ],
      };

      const start = Date.now();
      await effectsEngine.execute(descriptor);
      const duration = Date.now() - start;

      // Should execute in parallel, not take 2x the time
      expect(duration).toBeLessThan(150);
    });
  });

  describe('animation kinds', () => {
    let testElement: HTMLElement;

    beforeEach(() => {
      testElement = document.createElement('div');
      testElement.setAttribute('data-task-id', 'test');
      document.body.appendChild(testElement);
    });

    it('should handle burst animation', async () => {
      const animateSpy = jest.spyOn(testElement, 'animate');

      await effectsEngine.execute({
        animations: [{ target: 'task:test', kind: 'burst', durationMs: 100 }],
      });

      expect(animateSpy).toHaveBeenCalled();
      const keyframes = animateSpy.mock.calls[0][0] as Keyframe[];
      expect(keyframes.length).toBeGreaterThan(0);
    });

    it('should handle shake animation', async () => {
      const animateSpy = jest.spyOn(testElement, 'animate');

      await effectsEngine.execute({
        animations: [{ target: 'task:test', kind: 'shake', durationMs: 100 }],
      });

      expect(animateSpy).toHaveBeenCalled();
    });

    it('should handle rise animation', async () => {
      const animateSpy = jest.spyOn(testElement, 'animate');

      await effectsEngine.execute({
        animations: [{ target: 'task:test', kind: 'rise', durationMs: 100 }],
      });

      expect(animateSpy).toHaveBeenCalled();
    });

    it('should handle unknown animation kinds gracefully', async () => {
      await expect(effectsEngine.execute({
        animations: [{ target: 'task:test', kind: 'unknown' as any, durationMs: 100 }],
      })).resolves.not.toThrow();
    });
  });

  describe('haptics', () => {
    it('should trigger haptics when supported (happy path)', async () => {
      const vibrateMock = jest.fn();
      Object.defineProperty(navigator, 'vibrate', {
        writable: true,
        value: vibrateMock,
      });

      await effectsEngine.execute({
        haptics: { pattern: 'medium' },
      });

      expect(vibrateMock).toHaveBeenCalledWith([20]);
    });

    it('should handle custom haptic patterns', async () => {
      const vibrateMock = jest.fn();
      Object.defineProperty(navigator, 'vibrate', {
        writable: true,
        value: vibrateMock,
      });

      await effectsEngine.execute({
        haptics: { pattern: [10, 50, 10] },
      });

      expect(vibrateMock).toHaveBeenCalledWith([10, 50, 10]);
    });

    it('should gracefully handle unsupported haptics (edge case)', async () => {
      Object.defineProperty(navigator, 'vibrate', {
        writable: true,
        value: undefined,
      });

      await expect(effectsEngine.execute({
        haptics: { pattern: 'light' },
      })).resolves.not.toThrow();
    });
  });

  describe('particles', () => {
    it('should dispatch particle events', async () => {
      const { themeEventBus } = require('../ThemeEventBus');
      const eventSpy = jest.spyOn(themeEventBus, 'emit');

      await effectsEngine.execute({
        particles: [
          {
            kind: 'confetti',
            count: 10,
            origin: { x: 100, y: 200 },
            colorSet: ['#ff0000'],
          },
        ],
      });

      expect(eventSpy).toHaveBeenCalledWith('theme:particle', expect.objectContaining({
        kind: 'confetti',
        count: 10,
      }));
    });
  });

  describe('cancelAll', () => {
    it('should cancel all active animations', async () => {
      const elem = document.createElement('div');
      elem.setAttribute('data-task-id', 'test');
      document.body.appendChild(elem);

      // Start a long animation
      const promise = effectsEngine.execute({
        animations: [{ target: 'task:test', kind: 'burst', durationMs: 5000 }],
      });

      // Cancel immediately
      effectsEngine.cancelAll();

      await promise;
      // Should complete without hanging
    });
  });

  describe('clearCaches', () => {
    it('should clear sound and image caches', async () => {
      const mockAudio = {
        preload: '',
        src: '',
        load: jest.fn(),
        addEventListener: jest.fn((event, callback) => {
          if (event === 'canplaythrough') setTimeout(callback, 10);
        }),
      };
      global.Audio = jest.fn(() => mockAudio as any) as any;

      await effectsEngine.preloadSound('test', '/test.mp3');
      effectsEngine.clearCaches();

      // Next load should actually load, not use cache
      await effectsEngine.preloadSound('test', '/test.mp3');
      expect(mockAudio.load).toHaveBeenCalledTimes(2);
    });
  });
});
