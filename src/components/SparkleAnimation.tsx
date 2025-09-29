/** @jsxImportSource @emotion/react */
import React, { useEffect, useState } from 'react';
import { css, keyframes } from '@emotion/react';

interface SparkleAnimationProps {
  trigger: number;
  intensity?: 'minimal' | 'standard' | 'extra';
  x: number;
  y: number;
}

const sparkleKeyframes = keyframes`
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(var(--dx), var(--dy)) scale(0);
    opacity: 0;
  }
`;

const rotateKeyframes = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const containerStyle = css`
  position: fixed;
  pointer-events: none;
  z-index: 9999;
`;

const sparkleStyle = css`
  position: absolute;
  animation: ${sparkleKeyframes} 0.8s ease-out forwards;

  &::before {
    content: '✨';
    display: block;
    animation: ${rotateKeyframes} 0.8s linear;
  }
`;

interface Sparkle {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  delay: number;
  size: number;
}

export const SparkleAnimation: React.FC<SparkleAnimationProps> = ({
  trigger,
  intensity = 'standard',
  x,
  y
}) => {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  useEffect(() => {
    if (trigger === 0) return;

    const count = intensity === 'minimal' ? 4 : intensity === 'extra' ? 12 : 8;
    const newSparkles: Sparkle[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const distance = 40 + Math.random() * 60;

      newSparkles.push({
        id: Date.now() + i,
        x: 0,
        y: 0,
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance,
        delay: Math.random() * 0.2,
        size: 0.8 + Math.random() * 0.6
      });
    }

    setSparkles(newSparkles);

    const timer = setTimeout(() => {
      setSparkles([]);
    }, 1000);

    return () => clearTimeout(timer);
  }, [trigger, intensity]);

  if (sparkles.length === 0) return null;

  return (
    <div css={containerStyle} style={{ left: x, top: y }}>
      {sparkles.map(sparkle => (
        <div
          key={sparkle.id}
          css={sparkleStyle}
          style={{
            '--dx': `${sparkle.dx}px`,
            '--dy': `${sparkle.dy}px`,
            left: sparkle.x,
            top: sparkle.y,
            animationDelay: `${sparkle.delay}s`,
            fontSize: `${sparkle.size}em`
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};