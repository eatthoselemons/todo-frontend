/** @jsxImportSource @emotion/react */
import React, { useState } from 'react';
import { css } from '@emotion/react';
import { useRewardsContext } from '../../context/RewardsContext';
import { useTaskContext } from '../../context/TaskContext';
import { TabBar, Tab } from '../shared/TabBar';
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
  max-width: 700px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const header = css`
  padding: 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
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

const tabContainer = css`
  flex-shrink: 0;
  padding: 0 20px;
`;

const content = css`
  padding: 20px;
  overflow-y: auto;
  flex: 1;
`;

const tabPanel = css`
  display: none;

  &.active {
    display: block;
  }
`;

const tabs: Tab[] = [
  { id: 'rewards', label: 'Rewards', icon: '🎉' },
  { id: 'progress', label: 'Progress', icon: '📊' },
  { id: 'database', label: 'Database', icon: '💾' },
  { id: 'danger', label: 'Danger Zone', icon: '⚠️' },
];

export const SettingsPage: React.FC<SettingsPageProps> = ({ isOpen, onClose }) => {
  const { settings, progress, updateSettings, availableThemes } = useRewardsContext();
  const { db } = useTaskContext();
  const [activeTab, setActiveTab] = useState('rewards');

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

        <div css={tabContainer}>
          <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        <div css={content}>
          <div css={tabPanel} className={activeTab === 'rewards' ? 'active' : ''}>
            <RewardsPanel
              settings={settings}
              availableThemes={availableThemes}
              onUpdateSettings={updateSettings}
            />
          </div>

          <div css={tabPanel} className={activeTab === 'progress' ? 'active' : ''}>
            <ProgressStats progress={progress} />
          </div>

          <div css={tabPanel} className={activeTab === 'database' ? 'active' : ''}>
            <DatabaseDiagnostics db={db} />
          </div>

          <div css={tabPanel} className={activeTab === 'danger' ? 'active' : ''}>
            <DangerZone db={db} />
          </div>
        </div>
      </div>
    </div>
  );
};
