import { ThemeModule, ThemeManifest, ThemeServices } from '../types/theme';
import { effectsEngine } from './EffectsEngine';

/**
 * Theme Manager - Handles loading, switching, and managing themes
 * Uses CSS custom properties and adoptable stylesheets for performance
 */
class ThemeManager {
  private currentTheme: ThemeModule | null = null;
  private adoptedSheet: CSSStyleSheet | null = null;
  private themeRegistry: Map<string, ThemeModule> = new Map();
  private styleFallbackEl: HTMLStyleElement | null = null;
  private loadToken = 0;

  /**
   * Register a theme in the local registry
   */
  registerTheme(theme: ThemeModule): void {
    this.themeRegistry.set(theme.manifest.id, theme);
  }

  /**
   * Get all registered themes
   */
  getRegisteredThemes(): ThemeManifest[] {
    return Array.from(this.themeRegistry.values()).map(t => t.manifest);
  }

  /**
   * Get the currently active theme
   */
  getCurrentTheme(): ThemeModule | null {
    return this.currentTheme;
  }

  /**
   * Apply theme CSS using constructable stylesheets
   */
  private async applyThemeCss(cssTextOrUrl: string): Promise<void> {
    let cssText: string | null = null;

    // If it's a URL (http/https) or absolute path, fetch
    if (cssTextOrUrl.startsWith('http') || cssTextOrUrl.startsWith('/')) {
      try {
        const response = await fetch(cssTextOrUrl, { cache: 'force-cache' });
        cssText = await response.text();
      } catch (err) {
        console.error('Failed to fetch theme CSS:', err);
        return;
      }
    } else if (cssTextOrUrl.startsWith('data:')) {
      // Decode data URI (supports base64 and URL-encoded)
      try {
        const [, metaAndData] = cssTextOrUrl.split(':', 2);
        const [, dataPart] = metaAndData.split(',', 2);
        const isBase64 = /;base64/i.test(metaAndData);
        cssText = isBase64 ? atob(dataPart) : decodeURIComponent(dataPart);
      } catch (err) {
        console.error('Failed to decode data URI CSS:', err);
        return;
      }
    } else {
      // Treat as raw CSS text
      cssText = cssTextOrUrl;
    }

    if (cssText == null) return;

    // Use adoptedStyleSheets when supported, otherwise fallback to <style>
    const supportsAdopted = typeof (document as any).adoptedStyleSheets !== 'undefined' && typeof CSSStyleSheet === 'function';

    if (supportsAdopted) {
      if (!this.adoptedSheet) {
        this.adoptedSheet = new CSSStyleSheet();
      }

      try {
        this.adoptedSheet.replaceSync(cssText);

        const sheets = new Set(document.adoptedStyleSheets);
        sheets.add(this.adoptedSheet);
        document.adoptedStyleSheets = Array.from(sheets);
      } catch (err) {
        console.error('Failed to apply theme CSS (adoptedStyleSheets):', err);
      }
    } else {
      try {
        if (!this.styleFallbackEl) {
          this.styleFallbackEl = document.createElement('style');
          this.styleFallbackEl.setAttribute('data-app-theme', '');
          document.head.appendChild(this.styleFallbackEl);
        }
        this.styleFallbackEl.textContent = cssText;
      } catch (err) {
        console.error('Failed to apply theme CSS (style fallback):', err);
      }
    }
  }

  /**
   * Set the theme attribute on the document root
   */
  private setThemeAttribute(themeId: string): void {
    document.documentElement.setAttribute('data-theme', themeId);
  }

  /**
   * Load and activate a theme by ID
   */
  async loadTheme(themeId: string): Promise<ThemeModule | null> {
    const myToken = ++this.loadToken;
    // Check if theme is registered
    const theme = this.themeRegistry.get(themeId);
    if (!theme) {
      console.error(`Theme "${themeId}" not found in registry`);
      return null;
    }

    // Uninstall current theme if exists
    if (this.currentTheme?.uninstall) {
      try {
        // Cancel any active animations before switching
        effectsEngine.cancelAll();
        await this.currentTheme.uninstall();
      } catch (err) {
        console.error('Error uninstalling previous theme:', err);
      }
    }

    // Apply theme CSS if provided
    if (theme.manifest.tokensCssHref) {
      await this.applyThemeCss(theme.manifest.tokensCssHref);
    }

    // Install theme
    const services: ThemeServices = {
      preloadSound: (id, url) => effectsEngine.preloadSound(id, url),
      preloadImage: (id, url) => effectsEngine.preloadImage(id, url),
      log: (msg) => console.log(`[Theme: ${themeId}]`, msg),
    };

    if (theme.install) {
      try {
        await theme.install(services);
      } catch (err) {
        console.error('Error installing theme:', err);
        return null;
      }
    }

    // Preload theme assets
    if (theme.manifest.contributes?.sounds) {
      for (const [id, url] of Object.entries(theme.manifest.contributes.sounds)) {
        try {
          await effectsEngine.preloadSound(id, url);
        } catch (err) {
          console.warn(`Failed to preload sound "${id}":`, err);
        }
      }
    }

    if (theme.manifest.contributes?.assets) {
      for (const [id, url] of Object.entries(theme.manifest.contributes.assets)) {
        try {
          await effectsEngine.preloadImage(id, url);
        } catch (err) {
          console.warn(`Failed to preload asset "${id}":`, err);
        }
      }
    }

    // Guard against races: only apply if still latest load
    if (myToken === this.loadToken) {
      // Set theme attribute
      this.setThemeAttribute(theme.manifest.id);

      // Store as current theme
      this.currentTheme = theme;

      // Persist to localStorage
      try {
        localStorage.setItem('app:theme', themeId);
      } catch (err) {
        console.warn('Failed to persist theme preference:', err);
      }
    }

    return theme;
  }

  /**
   * Get the saved theme ID from localStorage
   */
  getSavedThemeId(): string | null {
    try {
      return localStorage.getItem('app:theme');
    } catch {
      return null;
    }
  }

  /**
   * Clean up and clear all theme data
   */
  cleanup(): void {
    if (this.currentTheme?.uninstall) {
      this.currentTheme.uninstall();
    }
    effectsEngine.clearCaches();
    this.currentTheme = null;
    // Remove adopted stylesheet
    if (this.adoptedSheet) {
      try {
        const sheets = new Set(document.adoptedStyleSheets);
        if (sheets.has(this.adoptedSheet)) {
          sheets.delete(this.adoptedSheet);
          document.adoptedStyleSheets = Array.from(sheets);
        }
      } catch {}
    }
    // Remove fallback <style>
    if (this.styleFallbackEl && this.styleFallbackEl.parentNode) {
      this.styleFallbackEl.parentNode.removeChild(this.styleFallbackEl);
      this.styleFallbackEl = null;
    }
  }
}

// Singleton instance
export const themeManager = new ThemeManager();
