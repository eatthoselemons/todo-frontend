/** @jsxImportSource @emotion/react */
import React, { useEffect, useState } from 'react';
import { useRewardsContext } from '../context/RewardsContext';
import { SparkleAnimation } from './SparkleAnimation';
import { LiquidCelebrationSplash } from './LiquidCelebrationSplash';
import { LiquidNodeFill } from './LiquidNodeFill';

// Central host that listens to theme bus events and renders visual effects
export const ThemeEffectsHost: React.FC = () => {
  const { on, off, settings } = useRewardsContext();

  // Sparkles
  const [sparkleTrigger, setSparkleTrigger] = useState(0);
  const [sparklePos, setSparklePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Celebration splash
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationCenter, setCelebrationCenter] = useState<{ x: number; y: number }>({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  // Liquid fill
  const [fillTarget, setFillTarget] = useState<HTMLElement | null>(null);
  const [showFill, setShowFill] = useState(false);

  useEffect(() => {
    // Particles
    const unsubscribeParticle = on('theme:particle', (data) => {
      if (!settings.enabled || !settings.animations) return;
      const origin = data.origin || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      setSparklePos(origin);

      // Branch per kind; for now, sparkles render path is a graceful fallback
      switch (data.kind) {
        case 'sparkles':
        case 'sparks':
        case 'confetti':
        case 'bubbles':
        default:
          setSparkleTrigger((v) => v + 1);
          break;
      }
    });

    // Custom animations
    const unsubscribeAnim = on('theme:animation', (data) => {
      if (!settings.enabled || !settings.animations) return;
      if (data.kind === 'celebrationSplash') {
        const origin = data.clientPos || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        setCelebrationCenter(origin);
        setShowCelebration(true);
      } else if (data.kind === 'liquidFill') {
        const target = data.targetElements && data.targetElements[0];
        if (target) {
          setFillTarget(target);
          setShowFill(true);
        }
      }
    });

    return () => {
      unsubscribeParticle();
      unsubscribeAnim();
    };
  }, [on, settings.enabled, settings.animations]);

  if (!settings.enabled) return null;

  return (
    <>
      {settings.animations && (
        <SparkleAnimation
          trigger={sparkleTrigger}
          intensity={settings.intensity === 'minimal' ? 'minimal' : settings.intensity === 'extra' ? 'extra' : 'standard'}
          x={sparklePos.x}
          y={sparklePos.y}
        />
      )}

      {settings.animations && (
        <LiquidCelebrationSplash
          show={showCelebration}
          centerX={celebrationCenter.x}
          centerY={celebrationCenter.y}
          onComplete={() => setShowCelebration(false)}
        />
      )}

      {settings.animations && (
        <LiquidNodeFill
          targetElement={fillTarget}
          show={showFill}
          onComplete={() => setShowFill(false)}
        />
      )}
    </>
  );
};

export default ThemeEffectsHost;
