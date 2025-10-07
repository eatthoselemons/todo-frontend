/** @jsxImportSource @emotion/react */
import React from 'react';
import { css, keyframes } from '@emotion/react';

interface LiquidBackgroundAmbienceProps {
  show: boolean;
  opacity?: number;
  color?: string;
}

const waveKeyframes = keyframes`
  0% {
    transform: translateX(0) translateY(0);
  }
  50% {
    transform: translateX(-25%) translateY(-5px);
  }
  100% {
    transform: translateX(-50%) translateY(0);
  }
`;

const floatKeyframes = keyframes`
  0%, 100% {
    transform: translateY(0) scale(1);
    opacity: 0.3;
  }
  50% {
    transform: translateY(-10px) scale(1.1);
    opacity: 0.5;
  }
`;

const shimmerKeyframes = keyframes`
  0%, 100% {
    opacity: 0.1;
  }
  50% {
    opacity: 0.3;
  }
`;

const containerStyle = css`
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 60px;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
  border-radius: inherit;
`;

const liquidLayerStyle = css`
  position: absolute;
  bottom: 0;
  left: 0;
  width: 200%;
  height: 100%;
  background: linear-gradient(180deg,
    rgba(52, 211, 153, 0.15) 0%,
    rgba(16, 185, 129, 0.2) 100%
  );

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: -10px;
    left: 0;
    width: 100%;
    height: 20px;
    background: inherit;
    border-radius: 50%;
  }

  &::before {
    animation: ${waveKeyframes} 8s ease-in-out infinite;
  }

  &::after {
    animation: ${waveKeyframes} 6s ease-in-out infinite reverse;
    opacity: 0.6;
    top: -5px;
  }
`;

const bubbleStyle = css`
  position: absolute;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.1) 100%);
  border-radius: 50%;
  animation: ${floatKeyframes} 4s ease-in-out infinite;
`;

const shimmerStyle = css`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.2) 50%,
    transparent 100%
  );
  animation: ${shimmerKeyframes} 3s ease-in-out infinite;
`;

const bubbles = [
  { id: 1, left: '15%', size: 4, delay: 0 },
  { id: 2, left: '35%', size: 6, delay: 1 },
  { id: 3, left: '55%', size: 3, delay: 2 },
  { id: 4, left: '75%', size: 5, delay: 0.5 },
  { id: 5, left: '90%', size: 4, delay: 1.5 },
];

export const LiquidBackgroundAmbience: React.FC<LiquidBackgroundAmbienceProps> = ({
  show,
  opacity = 1,
  color = 'rgba(52, 211, 153, 0.15)'
}) => {
  if (!show) return null;

  return (
    <div css={containerStyle} style={{ opacity }}>
      <div
        css={liquidLayerStyle}
        style={{
          background: `linear-gradient(180deg, ${color} 0%, ${color.replace('0.15', '0.2')} 100%)`
        }}
      >
        {bubbles.map(bubble => (
          <div
            key={bubble.id}
            css={bubbleStyle}
            style={{
              left: bubble.left,
              bottom: '5px',
              width: bubble.size,
              height: bubble.size,
              animationDelay: `${bubble.delay}s`
            }}
          />
        ))}
        <div css={shimmerStyle} />
      </div>
    </div>
  );
};
