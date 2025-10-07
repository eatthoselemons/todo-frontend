/** @jsxImportSource @emotion/react */
import React, { useEffect, useState } from 'react';
import { css, keyframes } from '@emotion/react';

interface SparkleAnimationProps {
  trigger: number;
  intensity?: 'minimal' | 'standard' | 'extra';
  x: number;
  y: number;
}

// Subtle motion and fade consistent with app’s glass/dark theme
const burstKeyframes = keyframes`
  0% {
    transform: translate(0, 0) scale(0.9);
    opacity: 0.9;
    filter: blur(0px);
  }
  60% {
    opacity: 0.8;
    filter: blur(0.5px);
  }
  100% {
    transform: translate(var(--dx), var(--dy)) scale(0.6);
    opacity: 0;
    filter: blur(1px);
  }
`;

const containerStyle = css`
  position: fixed;
  pointer-events: none;
  z-index: 9999;
`;

// Particle styled as a soft glowing dot using theme accents
const particleStyle = (variant: 'primary' | 'secondary') => css`
  position: absolute;
  width: var(--size);
  height: var(--size);
  border-radius: 50%;
  background: radial-gradient(
    circle at 40% 40%,
    ${variant === 'primary' ? 'var(--accent)' : 'var(--accent-2)'} 0%,
    rgba(255,255,255,0.25) 30%,
    rgba(255,255,255,0.05) 60%,
    transparent 70%
  );
  box-shadow:
    0 0 8px ${variant === 'primary' ? 'var(--accent)' : 'var(--accent-2)'},
    0 0 20px rgba(0,0,0,0.25);
  animation: ${burstKeyframes} var(--dur) ease-out forwards;
`;

interface Particle {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  delay: number;
  size: number; // in px
  variant: 'primary' | 'secondary';
  dur: number; // in s
}

export const SparkleAnimation: React.FC<SparkleAnimationProps> = ({
  trigger,
  intensity = 'standard',
  x,
  y
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (trigger === 0) return;

    const count = intensity === 'minimal' ? 5 : intensity === 'extra' ? 14 : 9;
    const items: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() * 0.6 - 0.3);
      const distance = 36 + Math.random() * 54; // shorter than before for subtlety
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      const size = 6 + Math.random() * 6; // 6–12px dots
      const delay = Math.random() * 0.1;
      const dur = 0.75 + Math.random() * 0.25; // 0.75–1.0s
      const variant: 'primary' | 'secondary' = Math.random() < 0.6 ? 'primary' : 'secondary';

      items.push({
        id: Date.now() + i,
        x: 0,
        y: 0,
        dx,
        dy,
        delay,
        size,
        variant,
        dur,
      });
    }

    setParticles(items);

    const timer = setTimeout(() => {
      setParticles([]);
    }, 1100);

    return () => clearTimeout(timer);
  }, [trigger, intensity]);

  if (particles.length === 0) return null;

  return (
    <div css={containerStyle} style={{ left: x, top: y }}>
      {particles.map(p => (
        <div
          key={p.id}
          css={particleStyle(p.variant)}
          style={{
            left: p.x,
            top: p.y,
            // custom properties for animation/styling
            ['--dx' as any]: `${p.dx}px`,
            ['--dy' as any]: `${p.dy}px`,
            ['--size' as any]: `${p.size}px`,
            ['--dur' as any]: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};
