import { EffectDescriptor, AnimationEffect, ParticleEffect, SoundEffect, HapticEffect } from '../types/theme';
import { themeEventBus } from './ThemeEventBus';

/**
 * Effects Engine - Executes theme effects (animations, sounds, haptics, particles)
 * This isolates all library dependencies and provides a clean API for themes
 * Uses Emittery event bus for particle emissions
 */
class EffectsEngine {
  private soundCache: Map<string, HTMLAudioElement> = new Map();
  private imageCache: Map<string, HTMLImageElement> = new Map();
  private activeAnimations: Set<Animation> = new Set();

  /**
   * Preload a sound file for later playback
   */
  async preloadSound(id: string, url: string): Promise<void> {
    if (this.soundCache.has(id)) return;

    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = url;

    return new Promise((resolve, reject) => {
      audio.addEventListener('canplaythrough', () => {
        this.soundCache.set(id, audio);
        resolve();
      }, { once: true });
      audio.addEventListener('error', reject, { once: true });
      audio.load();
    });
  }

  /**
   * Preload an image for later use
   */
  async preloadImage(id: string, url: string): Promise<void> {
    if (this.imageCache.has(id)) return;

    const img = new Image();
    img.src = url;

    return new Promise((resolve, reject) => {
      img.onload = () => {
        this.imageCache.set(id, img);
        resolve();
      };
      img.onerror = reject;
    });
  }

  /**
   * Execute a complete effect descriptor
   */
  async execute(descriptor: EffectDescriptor): Promise<void> {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const promises: Promise<void>[] = [];

    // Execute animations (unless reduced motion)
    if (descriptor.animations && !prefersReducedMotion) {
      promises.push(this.executeAnimations(descriptor.animations));
    }

    // Execute particles (unless reduced motion)
    if (descriptor.particles && !prefersReducedMotion) {
      promises.push(this.executeParticles(descriptor.particles));
    }

    // Play sound
    if (descriptor.sound) {
      promises.push(this.playSound(descriptor.sound));
    }

    // Trigger haptics
    if (descriptor.haptics) {
      promises.push(this.triggerHaptics(descriptor.haptics));
    }

    // Points are handled by the caller (RewardsContext)

    await Promise.allSettled(promises);
  }

  /**
   * Execute animation effects
   */
  private async executeAnimations(animations: AnimationEffect[]): Promise<void> {
    const promises = animations.map(async (anim) => {
      const elements = this.resolveTarget(anim.target);

      for (const element of elements) {
        await this.animateElement(element, anim);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Resolve a target selector to elements
   */
  private resolveTarget(target: string): HTMLElement[] {
    // Handle special targets like "task:123"
    if (target.startsWith('task:')) {
      const taskId = target.slice(5);
      const elements = document.querySelectorAll(`[data-task-id="${taskId}"]`);
      return Array.from(elements) as HTMLElement[];
    }

    // Regular CSS selector
    const elements = document.querySelectorAll(target);
    return Array.from(elements) as HTMLElement[];
  }

  /**
   * Animate a single element based on kind
   */
  private async animateElement(element: HTMLElement, anim: AnimationEffect): Promise<void> {
    const duration = anim.durationMs || 500;

    let keyframes: Keyframe[] = [];

    switch (anim.kind) {
      case 'burst':
        keyframes = [
          { transform: 'scale(1)', opacity: '1' },
          { transform: 'scale(1.3)', opacity: '0.8', offset: 0.5 },
          { transform: 'scale(1)', opacity: '1' }
        ];
        break;

      case 'shake':
        keyframes = [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-10px)', offset: 0.25 },
          { transform: 'translateX(10px)', offset: 0.5 },
          { transform: 'translateX(-10px)', offset: 0.75 },
          { transform: 'translateX(0)' }
        ];
        break;

      case 'rise':
        // Fade-in and rise to final position
        keyframes = [
          { transform: 'translateY(10px)', opacity: '0' },
          { transform: 'translateY(0)', opacity: '1' }
        ];
        break;

      default:
        // Custom/unknown animations are emitted for React renderers to handle
        themeEventBus.emitSync('theme:animation', {
          kind: anim.kind,
          targetElements: [element],
          params: anim.params,
        } as any);
        return;
    }

    if (keyframes.length > 0) {
      const animation = element.animate(keyframes, {
        duration,
        easing: 'ease-out',
        fill: 'forwards'
      });

      this.activeAnimations.add(animation);
      try {
        await animation.finished;
      } catch {
        // Swallow cancellation rejections
      } finally {
        this.activeAnimations.delete(animation);
      }
    }
  }

  /**
   * Execute particle effects using Emittery event bus
   */
  private async executeParticles(particles: ParticleEffect[]): Promise<void> {
    // Emit particle events through the event bus
    // React components can subscribe to these events
    const promises = particles.map(particle => themeEventBus.emit('theme:particle', particle as any));

    await Promise.allSettled(promises);
  }

  /**
   * Play a sound effect
   */
  private async playSound(sound: SoundEffect): Promise<void> {
    const audio = this.soundCache.get(sound.id);
    if (!audio) {
      console.warn(`Sound "${sound.id}" not preloaded`);
      return;
    }

    try {
      // Clone the audio to allow overlapping plays
      const audioClone = audio.cloneNode() as HTMLAudioElement;
      audioClone.volume = sound.volume ?? 0.5;

      await audioClone.play();
    } catch (err) {
      // Autoplay might be blocked
      console.warn('Could not play sound:', err);
    }
  }

  /**
   * Trigger haptic feedback
   */
  private async triggerHaptics(haptic: HapticEffect): Promise<void> {
    if (!navigator.vibrate) {
      return; // Haptics not supported
    }

    let pattern: number[];

    if (Array.isArray(haptic.pattern)) {
      pattern = haptic.pattern;
    } else {
      switch (haptic.pattern) {
        case 'light':
          pattern = [10];
          break;
        case 'medium':
          pattern = [20];
          break;
        case 'strong':
          pattern = [50];
          break;
        default:
          pattern = [10];
      }
    }

    try {
      navigator.vibrate(pattern);
    } catch (err) {
      console.warn('Could not trigger haptics:', err);
    }
  }

  /**
   * Cancel all active animations
   */
  cancelAll(): void {
    this.activeAnimations.forEach(anim => anim.cancel());
    this.activeAnimations.clear();
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.soundCache.clear();
    this.imageCache.clear();
  }
}

// Singleton instance
export const effectsEngine = new EffectsEngine();
