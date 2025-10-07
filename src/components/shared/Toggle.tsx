/** @jsxImportSource @emotion/react */
import React from 'react';
import { css } from '@emotion/react';

interface ToggleProps {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const toggleStyle = css`
  position: relative;
  width: 48px;
  height: 24px;
  background: var(--border);
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.3s;

  &.active {
    background: var(--accent);
  }

  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    background: white;
    border-radius: 10px;
    transition: transform 0.3s;
  }

  &.active::after {
    transform: translateX(24px);
  }
`;

export const Toggle: React.FC<ToggleProps> = ({ active, onClick, disabled = false }) => {
  return (
    <div
      css={toggleStyle}
      className={`${active ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={disabled ? undefined : onClick}
    />
  );
};
