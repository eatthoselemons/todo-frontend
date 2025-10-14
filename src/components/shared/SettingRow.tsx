/** @jsxImportSource @emotion/react */
import React, { ReactNode } from 'react';
import { css } from '@emotion/react';

interface SettingRowProps {
  label: string;
  description?: string;
  children: ReactNode;
}

const rowStyle = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  &:last-child {
    border-bottom: none;
  }
`;

const labelContainerStyle = css`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const labelTextStyle = css`
  font-size: 14px;
  color: var(--text);
`;

const descriptionStyle = css`
  font-size: 12px;
  color: var(--muted);
`;

export const SettingRow: React.FC<SettingRowProps> = ({ label, description, children }) => {
  return (
    <div css={rowStyle}>
      <div css={labelContainerStyle}>
        <div css={labelTextStyle}>{label}</div>
        {description && <div css={descriptionStyle}>{description}</div>}
      </div>
      {children}
    </div>
  );
};
