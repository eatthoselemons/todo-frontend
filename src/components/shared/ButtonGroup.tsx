/** @jsxImportSource @emotion/react */
import React from 'react';
import { css } from '@emotion/react';

interface ButtonGroupOption<T> {
  value: T;
  label: string;
  title?: string;
}

interface ButtonGroupProps<T> {
  options: ButtonGroupOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

const containerStyle = css`
  display: flex;
  gap: 8px;
`;

const buttonStyle = css`
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.05);
    color: var(--text);
  }

  &.active {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export function ButtonGroup<T extends string>({
  options,
  value,
  onChange,
  disabled = false
}: ButtonGroupProps<T>) {
  return (
    <div css={containerStyle}>
      {options.map(option => (
        <button
          key={option.value}
          css={buttonStyle}
          className={value === option.value ? 'active' : ''}
          onClick={() => onChange(option.value)}
          title={option.title}
          disabled={disabled}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
