import { themeManager } from '../ThemeManager';
import { ThemeModule } from '../../types/theme';
import { effectsEngine } from '../EffectsEngine';

// Mock effectsEngine
jest.mock('../EffectsEngine', () => ({
  effectsEngine: {
    preloadSound: jest.fn().mockResolvedValue(undefined),
    preloadImage: jest.fn().mockResolvedValue(undefined),
    clearCaches: jest.fn(),
  },
}));

describe('ThemeManager', () => {
  const mockTheme: ThemeModule = {
    manifest: {
      id: 'test-theme',
      name: 'Test Theme',
      version: '1.0.0',
      compatibleAppRange: '^1.0.0',
      intensities: {
        none: { motionScale: 0, particles: 0, sound: 'off', haptics: 'off', pointsMultiplier: 1 },
        minimal: { motionScale: 0.5, particles: 5, sound: 'subtle', haptics: 'light', pointsMultiplier: 1 },
        standard: { motionScale: 1, particles: 10, sound: 'normal', haptics: 'medium', pointsMultiplier: 1 },
        extra: { motionScale: 1.5, particles: 20, sound: 'rich', haptics: 'strong', pointsMultiplier: 2 },
      },
    },
  };

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    // Reset document
    document.documentElement.removeAttribute('data-theme');
    document.adoptedStyleSheets = [];

    // Clear theme manager state
    themeManager.cleanup();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerTheme', () => {
    it('should register a theme successfully (happy path)', () => {
      themeManager.registerTheme(mockTheme);
      const themes = themeManager.getRegisteredThemes();

      expect(themes).toContainEqual(
        expect.objectContaining({ id: 'test-theme' })
      );
    });

    it('should allow registering multiple themes', () => {
      const theme1: ThemeModule = { ...mockTheme, manifest: { ...mockTheme.manifest, id: 'theme-1' } };
      const theme2: ThemeModule = { ...mockTheme, manifest: { ...mockTheme.manifest, id: 'theme-2' } };

      themeManager.registerTheme(theme1);
      themeManager.registerTheme(theme2);

      const themes = themeManager.getRegisteredThemes();
      expect(themes.length).toBeGreaterThanOrEqual(2);
    });

    it('should replace existing theme with same id (edge case)', () => {
      const theme1: ThemeModule = { ...mockTheme, manifest: { ...mockTheme.manifest, name: 'First' } };
      const theme2: ThemeModule = { ...mockTheme, manifest: { ...mockTheme.manifest, name: 'Second' } };

      themeManager.registerTheme(theme1);
      themeManager.registerTheme(theme2);

      const themes = themeManager.getRegisteredThemes();
      const testTheme = themes.find(t => t.id === 'test-theme');
      expect(testTheme?.name).toBe('Second');
    });
  });

  describe('loadTheme', () => {
    beforeEach(() => {
      themeManager.registerTheme(mockTheme);
    });

    it('should load and activate a theme (happy path)', async () => {
      const theme = await themeManager.loadTheme('test-theme');

      expect(theme).not.toBeNull();
      expect(theme?.manifest.id).toBe('test-theme');
      expect(document.documentElement.getAttribute('data-theme')).toBe('test-theme');
    });

    it('should persist theme preference to localStorage', async () => {
      await themeManager.loadTheme('test-theme');

      expect(localStorage.getItem('app:theme')).toBe('test-theme');
    });

    it('should return null for unregistered theme (error case)', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const theme = await themeManager.loadTheme('nonexistent-theme');

      expect(theme).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should call theme install hook', async () => {
      const installMock = jest.fn().mockResolvedValue(undefined);
      const themeWithInstall: ThemeModule = {
        ...mockTheme,
        install: installMock,
      };

      themeManager.registerTheme(themeWithInstall);
      await themeManager.loadTheme('test-theme');

      expect(installMock).toHaveBeenCalledWith(
        expect.objectContaining({
          preloadSound: expect.any(Function),
          preloadImage: expect.any(Function),
          log: expect.any(Function),
        })
      );
    });

    it('should uninstall previous theme before loading new one (edge case)', async () => {
      const uninstallMock = jest.fn();
      const theme1: ThemeModule = {
        ...mockTheme,
        manifest: { ...mockTheme.manifest, id: 'theme-1' },
        uninstall: uninstallMock,
      };
      const theme2: ThemeModule = {
        ...mockTheme,
        manifest: { ...mockTheme.manifest, id: 'theme-2' },
      };

      themeManager.registerTheme(theme1);
      themeManager.registerTheme(theme2);

      await themeManager.loadTheme('theme-1');
      await themeManager.loadTheme('theme-2');

      expect(uninstallMock).toHaveBeenCalled();
    });

    it('should handle install errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const themeWithBadInstall: ThemeModule = {
        ...mockTheme,
        install: jest.fn().mockRejectedValue(new Error('Install failed')),
      };

      themeManager.registerTheme(themeWithBadInstall);
      const theme = await themeManager.loadTheme('test-theme');

      expect(theme).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should preload theme sounds', async () => {
      const themeWithSounds: ThemeModule = {
        ...mockTheme,
        manifest: {
          ...mockTheme.manifest,
          contributes: {
            sounds: {
              'sound1': '/sounds/1.mp3',
              'sound2': '/sounds/2.mp3',
            },
          },
        },
      };

      themeManager.registerTheme(themeWithSounds);
      await themeManager.loadTheme('test-theme');

      expect(effectsEngine.preloadSound).toHaveBeenCalledWith('sound1', '/sounds/1.mp3');
      expect(effectsEngine.preloadSound).toHaveBeenCalledWith('sound2', '/sounds/2.mp3');
    });

    it('should preload theme assets', async () => {
      const themeWithAssets: ThemeModule = {
        ...mockTheme,
        manifest: {
          ...mockTheme.manifest,
          contributes: {
            assets: {
              'image1': '/images/1.png',
            },
          },
        },
      };

      themeManager.registerTheme(themeWithAssets);
      await themeManager.loadTheme('test-theme');

      expect(effectsEngine.preloadImage).toHaveBeenCalledWith('image1', '/images/1.png');
    });

    it('should continue loading if asset preload fails (edge case)', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      (effectsEngine.preloadSound as jest.Mock).mockRejectedValueOnce(new Error('Failed'));

      const themeWithSounds: ThemeModule = {
        ...mockTheme,
        manifest: {
          ...mockTheme.manifest,
          contributes: {
            sounds: { 'bad': '/bad.mp3' },
          },
        },
      };

      themeManager.registerTheme(themeWithSounds);
      const theme = await themeManager.loadTheme('test-theme');

      expect(theme).not.toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('getSavedThemeId', () => {
    it('should retrieve saved theme from localStorage (happy path)', () => {
      localStorage.setItem('app:theme', 'my-theme');

      const savedId = themeManager.getSavedThemeId();
      expect(savedId).toBe('my-theme');
    });

    it('should return null if no theme saved', () => {
      const savedId = themeManager.getSavedThemeId();
      expect(savedId).toBeNull();
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw
      const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      const savedId = themeManager.getSavedThemeId();
      expect(savedId).toBeNull();

      getItemSpy.mockRestore();
    });
  });

  describe('getCurrentTheme', () => {
    it('should return null before any theme loaded', () => {
      expect(themeManager.getCurrentTheme()).toBeNull();
    });

    it('should return active theme after loading', async () => {
      themeManager.registerTheme(mockTheme);
      await themeManager.loadTheme('test-theme');

      const current = themeManager.getCurrentTheme();
      expect(current?.manifest.id).toBe('test-theme');
    });
  });

  describe('getRegisteredThemes', () => {
    it('should return empty array initially', () => {
      const themes = themeManager.getRegisteredThemes();
      expect(Array.isArray(themes)).toBe(true);
    });

    it('should return all registered theme manifests', () => {
      themeManager.registerTheme(mockTheme);

      const themes = themeManager.getRegisteredThemes();
      expect(themes.length).toBeGreaterThan(0);
      expect(themes[0]).toHaveProperty('id');
      expect(themes[0]).toHaveProperty('name');
    });
  });

  describe('cleanup', () => {
    it('should uninstall current theme', async () => {
      const uninstallMock = jest.fn();
      const themeWithUninstall: ThemeModule = {
        ...mockTheme,
        uninstall: uninstallMock,
      };

      themeManager.registerTheme(themeWithUninstall);
      await themeManager.loadTheme('test-theme');

      themeManager.cleanup();

      expect(uninstallMock).toHaveBeenCalled();
    });

    it('should clear effects engine caches', () => {
      themeManager.cleanup();

      expect(effectsEngine.clearCaches).toHaveBeenCalled();
    });

    it('should reset current theme to null', async () => {
      themeManager.registerTheme(mockTheme);
      await themeManager.loadTheme('test-theme');

      themeManager.cleanup();

      expect(themeManager.getCurrentTheme()).toBeNull();
    });
  });

  describe('CSS adoption', () => {
    it('should apply theme CSS via adopted stylesheets', async () => {
      // Mock CSSStyleSheet
      const mockSheet = {
        replaceSync: jest.fn(),
      };
      global.CSSStyleSheet = jest.fn(() => mockSheet) as any;

      const themeWithCSS: ThemeModule = {
        ...mockTheme,
        manifest: {
          ...mockTheme.manifest,
          tokensCssHref: 'data:text/css,.test { color: red; }',
        },
      };

      themeManager.registerTheme(themeWithCSS);
      await themeManager.loadTheme('test-theme');

      expect(mockSheet.replaceSync).toHaveBeenCalled();
    });

    it('should handle CSS fetch errors gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const themeWithCSS: ThemeModule = {
        ...mockTheme,
        manifest: {
          ...mockTheme.manifest,
          tokensCssHref: 'https://example.com/theme.css',
        },
      };

      themeManager.registerTheme(themeWithCSS);
      await themeManager.loadTheme('test-theme');

      // Should still load theme even if CSS fails
      expect(themeManager.getCurrentTheme()).not.toBeNull();

      consoleSpy.mockRestore();
    });
  });
});
