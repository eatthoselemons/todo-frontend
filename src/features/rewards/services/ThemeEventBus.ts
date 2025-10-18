import Emittery from 'emittery';
import { ThemeEvent, ParticleEffect } from '../types/theme';

/**
 * Typed event map for Emittery
 * Maps event types to their payload structures
 */
export interface ThemeEventMap {
  'task:complete': {
    taskId: string;
    isRoot?: boolean;
    clientPos?: { x: number; y: number };
    targetElement?: HTMLElement;
  };
  'task:create': {
    taskId: string;
    clientPos?: { x: number; y: number };
  };
  'task:delete': {
    taskId: string;
  };
  'branch:complete': {
    taskId: string;
    clientPos?: { x: number; y: number };
    targetElement?: HTMLElement;
  };
  'milestone': {
    label: string;
    value: number;
  };
  'idle': {
    timestamp: number;
  };
  'theme:particle': ParticleEffect;
  'theme:animation': {
    kind: string; // e.g., 'liquidFill' | 'celebrationSplash' | custom
    targetElements?: HTMLElement[];
    clientPos?: { x: number; y: number };
    params?: Record<string, any>;
  };
}

/**
 * Theme Event Bus - Centralized event system using Emittery
 * Provides type-safe event emission and subscription for theme effects
 */
class ThemeEventBus {
  private emitter: Emittery<ThemeEventMap>;

  constructor() {
    this.emitter = new Emittery<ThemeEventMap>();
  }

  /**
   * Emit a theme event
   */
  async emit<K extends keyof ThemeEventMap>(
    eventType: K,
    data: ThemeEventMap[K]
  ): Promise<void> {
    await this.emitter.emit(eventType, data);
  }

  /**
   * Emit a theme event without waiting for listeners
   */
  emitSync<K extends keyof ThemeEventMap>(
    eventType: K,
    data: ThemeEventMap[K]
  ): void {
    // Use setTimeout to make it truly async but non-blocking
    setTimeout(() => {
      this.emitter.emit(eventType, data).catch(err => {
        console.error('Error in theme event handler:', err);
      });
    }, 0);
  }

  /**
   * Subscribe to a specific event type
   */
  on<K extends keyof ThemeEventMap>(
    eventType: K,
    handler: (data: ThemeEventMap[K]) => void | Promise<void>
  ): () => void {
    return this.emitter.on(eventType, handler);
  }

  /**
   * Subscribe to a specific event type (once)
   */
  once<K extends keyof ThemeEventMap>(
    eventType: K
  ): Promise<ThemeEventMap[K]> {
    return this.emitter.once(eventType);
  }

  /**
   * Subscribe to multiple event types
   */
  onAny(
    handler: (eventType: keyof ThemeEventMap, data: any) => void | Promise<void>
  ): () => void {
    return this.emitter.onAny(handler);
  }

  /**
   * Remove a specific listener
   */
  off<K extends keyof ThemeEventMap>(
    eventType: K,
    handler: (data: ThemeEventMap[K]) => void | Promise<void>
  ): void {
    this.emitter.off(eventType, handler);
  }

  /**
   * Remove all listeners for a specific event type
   */
  clearListeners<K extends keyof ThemeEventMap>(eventType?: K): void {
    if (eventType) {
      this.emitter.clearListeners(eventType);
    } else {
      this.emitter.clearListeners();
    }
  }

  /**
   * Get the count of listeners for an event type
   */
  listenerCount<K extends keyof ThemeEventMap>(eventType?: K): number {
    return this.emitter.listenerCount(eventType);
  }

  /**
   * Wait for the next emission of an event
   */
  async waitFor<K extends keyof ThemeEventMap>(
    eventType: K,
    options?: {
      timeout?: number;
      filter?: (data: ThemeEventMap[K]) => boolean;
    }
  ): Promise<ThemeEventMap[K]> {
    const { timeout, filter } = options || {};

    if (timeout) {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout waiting for ${String(eventType)}`)), timeout);
      });

      const eventPromise = filter
        ? this.emitter.once(eventType).then(data => {
            if (!filter(data)) {
              return this.waitFor(eventType, options);
            }
            return data;
          })
        : this.emitter.once(eventType);

      return Promise.race([eventPromise, timeoutPromise]);
    }

    if (filter) {
      const data = await this.emitter.once(eventType);
      if (!filter(data)) {
        return this.waitFor(eventType, options);
      }
      return data;
    }

    return this.emitter.once(eventType);
  }

  /**
   * Convert event data to ThemeEvent format (for backward compatibility)
   * Uses mapped types to ensure type safety
   */
  toThemeEvent<K extends keyof ThemeEventMap>(
    eventType: K,
    data: ThemeEventMap[K]
  ): ThemeEvent {
    return {
      type: eventType,
      ...data,
    } as ThemeEvent;
  }
}

// Singleton instance
export const themeEventBus = new ThemeEventBus();
