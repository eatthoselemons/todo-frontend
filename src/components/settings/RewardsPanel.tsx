/** @jsxImportSource @emotion/react */
import React from 'react';
import { css } from '@emotion/react';
import { RewardsSettings } from '../../context/RewardsContext';
import { Intensity } from '../../types/theme';
import { SettingRow } from '../shared/SettingRow';
import { Toggle } from '../shared/Toggle';
import { ButtonGroup } from '../shared/ButtonGroup';

interface RewardsPanelProps {
  settings: RewardsSettings;
  availableThemes: Array<{ id: string; name: string; description?: string }>;
  onUpdateSettings: (updates: Partial<RewardsSettings>) => void;
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

const intensityOptions: Array<{ value: Intensity; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'standard', label: 'Standard' },
  { value: 'extra', label: 'Extra Juicy' },
];

export const RewardsPanel: React.FC<RewardsPanelProps> = ({
  settings,
  availableThemes,
  onUpdateSettings,
}) => {
  const handleToggle = (key: keyof RewardsSettings) => {
    if (typeof settings[key] === 'boolean') {
      onUpdateSettings({ [key]: !settings[key] });
    }
  };

  return (
    <div css={sectionStyle}>
      <div css={sectionTitleStyle}>Rewards System</div>

      <SettingRow
        label="Enable Rewards"
        description="Turn on animations and feedback when completing tasks"
      >
        <Toggle
          active={settings.enabled}
          onClick={() => handleToggle('enabled')}
        />
      </SettingRow>

      {settings.enabled && (
        <>
          <SettingRow
            label="Theme"
            description="Visual style and animation theme"
          >
            <ButtonGroup
              options={availableThemes.map(theme => ({
                value: theme.id,
                label: theme.name,
                title: theme.description,
              }))}
              value={settings.theme}
              onChange={(theme) => onUpdateSettings({ theme })}
            />
          </SettingRow>

          <SettingRow
            label="Intensity"
            description="How much celebration do you want?"
          >
            <ButtonGroup
              options={intensityOptions}
              value={settings.intensity}
              onChange={(intensity) => onUpdateSettings({ intensity })}
            />
          </SettingRow>

          <SettingRow
            label="Animations"
            description="Visual effects and celebrations"
          >
            <Toggle
              active={settings.animations}
              onClick={() => handleToggle('animations')}
            />
          </SettingRow>

          <SettingRow
            label="Sounds"
            description="Audio feedback on completion"
          >
            <Toggle
              active={settings.sounds}
              onClick={() => handleToggle('sounds')}
            />
          </SettingRow>

          <SettingRow
            label="Haptics"
            description="Vibration feedback (mobile)"
          >
            <Toggle
              active={settings.haptics}
              onClick={() => handleToggle('haptics')}
            />
          </SettingRow>

          <SettingRow
            label="Streak Tracking"
            description="Track consecutive days of activity"
          >
            <Toggle
              active={settings.streaks}
              onClick={() => handleToggle('streaks')}
            />
          </SettingRow>

          <SettingRow
            label="Progression System"
            description="Enable levels, XP, and milestone celebrations"
          >
            <Toggle
              active={settings.progression}
              onClick={() => handleToggle('progression')}
            />
          </SettingRow>
        </>
      )}
    </div>
  );
};
