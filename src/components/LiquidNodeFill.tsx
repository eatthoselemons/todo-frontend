/** @jsxImportSource @emotion/react */
import React, { useEffect, useState } from 'react';
import { css, keyframes } from '@emotion/react';

interface LiquidNodeFillProps {
  targetElement: HTMLElement | null;
  show: boolean;
  onComplete?: () => void;
  color?: string;
}

const waveKeyframes = keyframes`
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
`;

const fillKeyframes = keyframes`
  0% {
    height: 0%;
  }
  100% {
    height: 100%;
  }
`;

const sparkleKeyframes = keyframes`
  0%, 100% {
    opacity: 0;
    transform: scale(0.5);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
`;

const liquidOverlayStyle = css`
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 0%;
  border-radius: inherit;
  overflow: hidden;
  pointer-events: none;
  animation: ${fillKeyframes} 0.8s ease-out forwards;
  z-index: 1;
`;

const liquidStyle = css`
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg,
    rgba(52, 211, 153, 0.4) 0%,
    rgba(16, 185, 129, 0.5) 100%
  );

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: -5px;
    left: 0;
    width: 200%;
    height: 10px;
    background: inherit;
    border-radius: 50%;
    animation: ${waveKeyframes} 2s linear infinite;
  }

  &::after {
    animation-duration: 1.5s;
    animation-direction: reverse;
    opacity: 0.6;
    top: -3px;
  }
`;

const sparkleStyle = css`
  position: absolute;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, transparent 70%);
  border-radius: 50%;
  animation: ${sparkleKeyframes} 1.2s ease-in-out;
  pointer-events: none;
`;

export const LiquidNodeFill: React.FC<LiquidNodeFillProps> = ({
  targetElement,
  show,
  onComplete,
  color = 'rgba(52, 211, 153, 0.4)'
}) => {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; y: number; size: number }>>([]);

  useEffect(() => {
    if (show && targetElement) {
      const elementRect = targetElement.getBoundingClientRect();
      setRect(elementRect);

      // Generate sparkles around the element
      const newSparkles = Array.from({ length: 5 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * elementRect.width,
        y: Math.random() * elementRect.height,
        size: 3 + Math.random() * 5
      }));
      setSparkles(newSparkles);

      // Auto-complete after animation
      const timer = setTimeout(() => {
        if (onComplete) onComplete();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [show, targetElement, onComplete]);

  if (!show || !rect) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        pointerEvents: 'none',
        zIndex: 10
      }}
    >
      <div css={liquidOverlayStyle}>
        <div
          css={liquidStyle}
          style={{
            background: `linear-gradient(180deg, ${color} 0%, ${color.replace('0.4', '0.6')} 100%)`
          }}
        />
      </div>
      {sparkles.map(sparkle => (
        <div
          key={sparkle.id}
          css={sparkleStyle}
          style={{
            left: sparkle.x,
            top: sparkle.y,
            width: sparkle.size,
            height: sparkle.size,
          }}
        />
      ))}
    </div>
  );
};
