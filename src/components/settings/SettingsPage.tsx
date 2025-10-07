/** @jsxImportSource @emotion/react */
import React from 'react';
import { css } from '@emotion/react';
import { useRewardsContext } from '../../context/RewardsContext';
import { useTaskContext } from '../../context/TaskContext';
import { DatabaseDiagnostics } from './DatabaseDiagnostics';
import { ProgressStats } from './ProgressStats';
import { RewardsPanel } from './RewardsPanel';
import { DangerZone } from './DangerZone';

interface SettingsPageProps {
  isOpen: boolean;
  onClose: () => void;
}

const modalOverlay = css`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
`;

const modalContent = css`
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
`;

const header = css`
  padding: 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const title = css`
  font-size: 24px;
  font-weight: 600;
`;

const closeButton = css`
  background: transparent;
  border: none;
  color: var(--muted);
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text);
  }
`;

const content = css`
  padding: 20px;
`;

export const SettingsPage: React.FC<SettingsPageProps> = ({ isOpen, onClose }) => {
  const { settings, progress, updateSettings, availableThemes } = useRewardsContext();
  const { db } = useTaskContext();

  if (!isOpen) return null;

  return (
    <div css={modalOverlay} onClick={onClose}>
      <div css={modalContent} onClick={(e) => e.stopPropagation()}>
        <div css={header}>
          <div css={title}>Settings</div>
          <button css={closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div css={content}>
          <DatabaseDiagnostics db={db} />
          <ProgressStats progress={progress} />
          <DangerZone db={db} />
          <RewardsPanel
            settings={settings}
            availableThemes={availableThemes}
            onUpdateSettings={updateSettings}
          />
        </div>
      </div>
    </div>
  );
};
