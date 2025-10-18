/** @jsxImportSource @emotion/react */
import React from 'react';
import { css } from '@emotion/react';
import { RewardsProgress } from '../../../features/rewards/context/RewardsContext';

interface ProgressStatsProps {
  progress: RewardsProgress;
}

const sectionStyle = css`
  margin-bottom: 32px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const sectionTitleStyle = css`
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 16px;
  color: var(--text);
`;

const statsCardStyle = css`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
`;

const statStyle = css`
  text-align: center;
`;

const statValueStyle = css`
  font-size: 24px;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 4px;
`;

const statLabelStyle = css`
  font-size: 12px;
  color: var(--muted);
  text-transform: uppercase;
`;

export const ProgressStats: React.FC<ProgressStatsProps> = ({ progress }) => {
  return (
    <div css={sectionStyle}>
      <div css={sectionTitleStyle}>Your Progress</div>
      <div css={statsCardStyle}>
        <div css={statStyle}>
          <div css={statValueStyle}>{progress.points}</div>
          <div css={statLabelStyle}>Points</div>
        </div>
        <div css={statStyle}>
          <div css={statValueStyle}>{progress.level}</div>
          <div css={statLabelStyle}>Level</div>
        </div>
        <div css={statStyle}>
          <div css={statValueStyle}>{progress.totalTasks}</div>
          <div css={statLabelStyle}>Tasks Done</div>
        </div>
      </div>
    </div>
  );
};
