/** @jsxImportSource @emotion/react */
import React, { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { useRewardsContext } from '../../context/RewardsContext';
import type { ParticleEffect } from '../../types/theme';
import { LiquidNodeFill } from './LiquidNodeFill';
import { LiquidCelebrationSplash } from './LiquidCelebrationSplash';

const containerStyle = css`
  position: fixed;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 9998;
`;

type RendererAPI = {
  dispose: () => void;
  pause: () => void;
  resume: () => void;
  handleParticle: (p: ParticleEffect) => void;
  handleAnimation: (a: any) => void;
};

export const AdvancedThreeEffectsHost: React.FC = () => {
  const { on, settings } = useRewardsContext();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<RendererAPI | null>(null);
  const [ready, setReady] = useState(false);

  // DOM-based animation states (for liquid fill, celebration splash, etc.)
  const [fillTarget, setFillTarget] = useState<HTMLElement | null>(null);
  const [showFill, setShowFill] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationCenter, setCelebrationCenter] = useState<{ x: number; y: number }>({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2
  });

  // Only active for standard/extra
  const active = settings.enabled && settings.animations && (settings.intensity === 'standard' || settings.intensity === 'extra');

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    (async () => {
      try {
        const mod = await import('../../three/ThreeRenderer');
        if (cancelled) return;
        const api: RendererAPI = await mod.initThreeRenderer(containerRef.current!);
        if (cancelled) {
          api.dispose();
          return;
        }
        rendererRef.current = api;
        setReady(true);
      } catch (e) {
        // Failed to init three renderer; remain in DOM-only mode
        console.warn('Three renderer failed to initialize:', e);
      }
    })();

    return () => {
      cancelled = true;
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
    };
  }, [active]);

  // Forward events - set up once on mount, use ref to track active state
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const unsubParticles = on('theme:particle', (p) => {
      if (!activeRef.current) return;
      // Non-blocking; ignore if renderer not yet ready
      if (rendererRef.current) {
        rendererRef.current.handleParticle(p);
      }
    });

    const unsubAnim = on('theme:animation', (a) => {
      if (!activeRef.current) return;

      // Handle DOM-based animations (liquid fill, celebration splash)
      if (a.kind === 'liquidFill') {
        const target = a.targetElements && a.targetElements[0];
        if (target) {
          setFillTarget(target);
          setShowFill(true);
        }
      } else if (a.kind === 'celebrationSplash') {
        const origin = a.clientPos || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        setCelebrationCenter(origin);
        setShowCelebration(true);
      } else if (rendererRef.current) {
        // Forward other animations to Three.js renderer
        rendererRef.current.handleAnimation(a);
      }
    });

    return () => {
      unsubParticles();
      unsubAnim();
    };
  }, [on]);

  // Pause on background
  useEffect(() => {
    if (!active) return;
    const onVis = () => {
      if (!rendererRef.current) return;
      if (document.visibilityState === 'hidden') rendererRef.current.pause();
      else rendererRef.current.resume();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [active]);

  if (!active) return null;

  return (
    <>
      <div ref={containerRef} css={containerStyle} aria-hidden={!ready} />

      {/* DOM-based animations that work alongside Three.js */}
      <LiquidNodeFill
        targetElement={fillTarget}
        show={showFill}
        onComplete={() => setShowFill(false)}
      />

      <LiquidCelebrationSplash
        show={showCelebration}
        centerX={celebrationCenter.x}
        centerY={celebrationCenter.y}
        onComplete={() => setShowCelebration(false)}
      />
    </>
  );
};

export default AdvancedThreeEffectsHost;

