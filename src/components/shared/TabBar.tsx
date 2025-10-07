/** @jsxImportSource @emotion/react */
import React from 'react';
import { css } from '@emotion/react';

export interface Tab {
  id: string;
  label: string;
  icon?: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const containerStyle = css`
  display: flex;
  border-bottom: 2px solid var(--border);
  gap: 4px;
  overflow-x: auto;

  /* Hide scrollbar but keep functionality */
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;

const tabStyle = css`
  padding: 12px 20px;
  background: transparent;
  border: none;
  color: var(--muted);
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;

  &:hover {
    color: var(--text);
    background: rgba(255, 255, 255, 0.05);
  }

  &.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }
`;

export const TabBar: React.FC<TabBarProps> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div css={containerStyle}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          css={tabStyle}
          className={activeTab === tab.id ? 'active' : ''}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.icon && <span style={{ marginRight: '8px' }}>{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
};
