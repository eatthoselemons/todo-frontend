/** @jsxImportSource @emotion/react */
import React, { useEffect, useState } from 'react';
import { css, keyframes } from '@emotion/react';

interface LiquidCelebrationSplashProps {
  show: boolean;
  onComplete?: () => void;
  centerX?: number;
  centerY?: number;
}

const burstKeyframes = keyframes`
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
  100% {
    transform: translate(-50%, -50%) scale(3);
    opacity: 0;
  }
`;

const dropletKeyframes = keyframes`
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(var(--tx), var(--ty)) scale(0.3);
    opacity: 0;
  }
`;

const rippleKeyframes = keyframes`
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 0.6;
  }
  100% {
    transform: translate(-50%, -50%) scale(4);
    opacity: 0;
  }
`;

const containerStyle = css`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 9999;
`;

const burstStyle = css`
  position: absolute;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: radial-gradient(circle,
    rgba(99, 102, 241, 0.6) 0%,
    rgba(139, 92, 246, 0.4) 50%,
    transparent 100%
  );
  animation: ${burstKeyframes} 1s ease-out;
`;

const rippleStyle = css`
  position: absolute;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 3px solid rgba(99, 102, 241, 0.6);
  animation: ${rippleKeyframes} 1.2s ease-out;
`;

const dropletStyle = css`
  position: absolute;
  background: linear-gradient(135deg,
    rgba(99, 102, 241, 0.8) 0%,
    rgba(139, 92, 246, 0.8) 100%
  );
  border-radius: 50% 0 50% 50%;
  animation: ${dropletKeyframes} 1s ease-out forwards;
`;

interface Droplet {
  id: number;
  size: number;
  angle: number;
  distance: number;
  delay: number;
}

export const LiquidCelebrationSplash: React.FC<LiquidCelebrationSplashProps> = ({
  show,
  onComplete,
  centerX = window.innerWidth / 2,
  centerY = window.innerHeight / 2
}) => {
  const [droplets, setDroplets] = useState<Droplet[]>([]);

  useEffect(() => {
    if (show) {
      // Generate droplets in all directions
      const newDroplets: Droplet[] = [];
      const dropletCount = 12;

      for (let i = 0; i < dropletCount; i++) {
        const angle = (i / dropletCount) * Math.PI * 2;
        newDroplets.push({
          id: i,
          size: 8 + Math.random() * 12,
          angle,
          distance: 80 + Math.random() * 120,
          delay: Math.random() * 0.2
        });
      }

      setDroplets(newDroplets);

      // Auto-complete after animation
      const timer = setTimeout(() => {
        if (onComplete) onComplete();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div css={containerStyle}>
      {/* Central burst */}
      <div
        css={burstStyle}
        style={{
          left: centerX,
          top: centerY
        }}
      />

      {/* Ripple waves */}
      {[0, 1, 2].map(i => (
        <div
          key={`ripple-${i}`}
          css={rippleStyle}
          style={{
            left: centerX,
            top: centerY,
            animationDelay: `${i * 0.15}s`
          }}
        />
      ))}

      {/* Droplets */}
      {droplets.map(droplet => {
        const tx = Math.cos(droplet.angle) * droplet.distance;
        const ty = Math.sin(droplet.angle) * droplet.distance;

        return (
          <div
            key={droplet.id}
            css={dropletStyle}
            style={{
              left: centerX,
              top: centerY,
              width: droplet.size,
              height: droplet.size,
              '--tx': `${tx}px`,
              '--ty': `${ty}px`,
              animationDelay: `${droplet.delay}s`,
              transform: `translate(-50%, -50%) rotate(${droplet.angle * 180 / Math.PI}deg)`
            } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
};
