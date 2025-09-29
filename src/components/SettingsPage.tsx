/** @jsxImportSource @emotion/react */
import React from "react";
import { css } from "@emotion/react";
import { useRewardsContext } from "../context/RewardsContext";

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

const section = css`
  margin-bottom: 32px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const sectionTitle = css`
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 16px;
  color: var(--text);
`;

const setting = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  &:last-child {
    border-bottom: none;
  }
`;

const settingLabel = css`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const labelText = css`
  font-size: 14px;
  color: var(--text);
`;

const labelDescription = css`
  font-size: 12px;
  color: var(--muted);
`;

const toggle = css`
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

const intensitySelector = css`
  display: flex;
  gap: 8px;
`;

const intensityOption = css`
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--text);
  }

  &.active {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }
`;

const statsCard = css`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
`;

const stat = css`
  text-align: center;
`;

const statValue = css`
  font-size: 24px;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 4px;
`;

const statLabel = css`
  font-size: 12px;
  color: var(--muted);
  text-transform: uppercase;
`;

export const SettingsPage: React.FC<SettingsPageProps> = ({ isOpen, onClose }) => {
  const { settings, progress, updateSettings } = useRewardsContext();

  if (!isOpen) return null;

  const handleToggle = (key: keyof typeof settings) => {
    if (typeof settings[key] === 'boolean') {
      updateSettings({ [key]: !settings[key] });
    }
  };

  const handleIntensityChange = (intensity: typeof settings.intensity) => {
    updateSettings({ intensity });
  };

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
          {/* Progress Stats */}
          <div css={section}>
            <div css={sectionTitle}>Your Progress</div>
            <div css={statsCard}>
              <div css={stat}>
                <div css={statValue}>{progress.points}</div>
                <div css={statLabel}>Points</div>
              </div>
              <div css={stat}>
                <div css={statValue}>{progress.level}</div>
                <div css={statLabel}>Level</div>
              </div>
              <div css={stat}>
                <div css={statValue}>{progress.totalTasks}</div>
                <div css={statLabel}>Tasks Done</div>
              </div>
            </div>
          </div>

          {/* Rewards Settings */}
          <div css={section}>
            <div css={sectionTitle}>Rewards System</div>

            <div css={setting}>
              <div css={settingLabel}>
                <div css={labelText}>Enable Rewards</div>
                <div css={labelDescription}>
                  Turn on animations and feedback when completing tasks
                </div>
              </div>
              <div
                css={toggle}
                className={settings.enabled ? 'active' : ''}
                onClick={() => handleToggle('enabled')}
              />
            </div>

            {settings.enabled && (
              <>
                <div css={setting}>
                  <div css={settingLabel}>
                    <div css={labelText}>Intensity</div>
                    <div css={labelDescription}>
                      How much celebration do you want?
                    </div>
                  </div>
                  <div css={intensitySelector}>
                    {(['none', 'minimal', 'standard', 'extra'] as const).map((level) => (
                      <button
                        key={level}
                        css={intensityOption}
                        className={settings.intensity === level ? 'active' : ''}
                        onClick={() => handleIntensityChange(level)}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div css={setting}>
                  <div css={settingLabel}>
                    <div css={labelText}>Animations</div>
                    <div css={labelDescription}>Visual effects and celebrations</div>
                  </div>
                  <div
                    css={toggle}
                    className={settings.animations ? 'active' : ''}
                    onClick={() => handleToggle('animations')}
                  />
                </div>

                <div css={setting}>
                  <div css={settingLabel}>
                    <div css={labelText}>Sounds</div>
                    <div css={labelDescription}>Audio feedback on completion</div>
                  </div>
                  <div
                    css={toggle}
                    className={settings.sounds ? 'active' : ''}
                    onClick={() => handleToggle('sounds')}
                  />
                </div>

                <div css={setting}>
                  <div css={settingLabel}>
                    <div css={labelText}>Haptics</div>
                    <div css={labelDescription}>Vibration feedback (mobile)</div>
                  </div>
                  <div
                    css={toggle}
                    className={settings.haptics ? 'active' : ''}
                    onClick={() => handleToggle('haptics')}
                  />
                </div>

                <div css={setting}>
                  <div css={settingLabel}>
                    <div css={labelText}>Streak Tracking</div>
                    <div css={labelDescription}>Track consecutive days of activity</div>
                  </div>
                  <div
                    css={toggle}
                    className={settings.streaks ? 'active' : ''}
                    onClick={() => handleToggle('streaks')}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};