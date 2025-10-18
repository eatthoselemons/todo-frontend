/** @jsxImportSource @emotion/react */
import React, { useEffect, useState } from 'react';
import { css, keyframes } from '@emotion/react';

interface LiquidProgressAnimationProps {
  progress: number; // 0 to 100
  show: boolean;
  onComplete?: () => void;
  label?: string;
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
    height: var(--fill-height);
  }
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

const containerStyle = css`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10000;
  animation: ${fadeIn} 0.3s ease-out;
`;

const glassContainerStyle = css`
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.2);
  position: relative;
  overflow: hidden;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px rgba(255, 255, 255, 0.2);
`;

const liquidStyle = css`
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  background: linear-gradient(180deg,
    rgba(99, 102, 241, 0.8) 0%,
    rgba(139, 92, 246, 0.8) 100%
  );
  animation: ${fillKeyframes} 1.5s ease-out forwards;
  --fill-height: 0%;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: -10px;
    left: 0;
    width: 200%;
    height: 20px;
    background: inherit;
    border-radius: 50%;
    animation: ${waveKeyframes} 3s linear infinite;
  }

  &::after {
    animation-duration: 2.5s;
    animation-direction: reverse;
    opacity: 0.5;
    top: -5px;
  }
`;

const bubbleKeyframes = keyframes`
  0% {
    transform: translateY(0) scale(1);
    opacity: 0.8;
  }
  100% {
    transform: translateY(-180px) scale(0.3);
    opacity: 0;
  }
`;

const bubbleStyle = css`
  position: absolute;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  animation: ${bubbleKeyframes} 2s ease-out infinite;
`;

const labelStyle = css`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 24px;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  z-index: 10;
`;

const overlayStyle = css`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
`;

export const LiquidProgressAnimation: React.FC<LiquidProgressAnimationProps> = ({
  progress,
  show,
  onComplete,
  label
}) => {
  const [bubbles, setBubbles] = useState<Array<{ id: number; left: number; size: number; delay: number }>>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      // Generate random bubbles
      const newBubbles = Array.from({ length: 8 }, (_, i) => ({
        id: Date.now() + i,
        left: 20 + Math.random() * 60,
        size: 4 + Math.random() * 12,
        delay: Math.random() * 2
      }));
      setBubbles(newBubbles);

      // Auto-hide after animation
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onComplete) onComplete();
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [show, onComplete]);

  if (!isVisible) return null;

  return (
    <>
      <div css={overlayStyle} />
      <div css={containerStyle}>
        <div css={glassContainerStyle}>
          <div
            css={liquidStyle}
            style={{ '--fill-height': `${progress}%` } as React.CSSProperties}
          >
            {bubbles.map(bubble => (
              <div
                key={bubble.id}
                css={bubbleStyle}
                style={{
                  left: `${bubble.left}%`,
                  width: `${bubble.size}px`,
                  height: `${bubble.size}px`,
                  animationDelay: `${bubble.delay}s`,
                  bottom: '10px'
                }}
              />
            ))}
          </div>
          <div css={labelStyle}>
            {label || `${progress}%`}
          </div>
        </div>
      </div>
    </>
  );
};