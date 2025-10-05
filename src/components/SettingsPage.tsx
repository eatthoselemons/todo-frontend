/** @jsxImportSource @emotion/react */
import React, { useEffect, useMemo, useState } from "react";
import { css } from "@emotion/react";
import { useRewardsContext } from "../context/RewardsContext";
import useTaskHooks from "../hooks/useTaskHooks";
import { Task, ROOT_ID } from "../domain/Task";
import { useTaskContext } from "../context/TaskContext";

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
  const { db } = useTaskContext();
  const { getRootTasks, createTask } = useTaskHooks();

  // DB diagnostics
  const [dbInfo, setDbInfo] = useState<{ adapter?: string; doc_count?: number } | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [checkingDb, setCheckingDb] = useState(false);
  const [rootTasksPreview, setRootTasksPreview] = useState<Array<{id: string; text: string}>>([]);
  const [tasksDiagError, setTasksDiagError] = useState<string | null>(null);
  const [dangerInProgress, setDangerInProgress] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const info = await db!.info();
        setDbInfo({ adapter: (info as any).adapter, doc_count: (info as any).doc_count });
        setDbError(null);
      } catch (e: any) {
        setDbInfo(null);
        setDbError(e?.message || String(e));
      }
    })();
  }, [isOpen, db]);

  const runDbHealthCheck = async () => {
    setCheckingDb(true);
    setDbError(null);
    try {
      const id = `healthcheck-${Date.now()}`;
      await db!.put({ _id: id, ts: Date.now() } as any);
      const got = await db!.get(id);
      await db!.remove(got);
      const info = await db!.info();
      setDbInfo({ adapter: (info as any).adapter, doc_count: (info as any).doc_count });
    } catch (e: any) {
      setDbError(e?.message || String(e));
    } finally {
      setCheckingDb(false);
    }
  };

  const listRootTasks = async () => {
    setTasksDiagError(null);
    try {
      const tasks = await getRootTasks();
      setRootTasksPreview(tasks.map(t => ({ id: t.id as any, text: t.text })));
    } catch (e: any) {
      setTasksDiagError(e?.message || String(e));
    }
  };

  const createSampleRootTask = async () => {
    setTasksDiagError(null);
    try {
      const sample = new Task(`Sample Task ${new Date().toLocaleTimeString()}`);
      await createTask(sample, ROOT_ID);
      await listRootTasks();
    } catch (e: any) {
      setTasksDiagError(e?.message || String(e));
    }
  };

  const resetDatabase = async () => {
    if (!window.confirm('This will delete ALL data in the local database for this app on this browser. Continue?')) return;
    setDangerInProgress(true);
    try {
      await db!.destroy();
      // Reload to reinitialize providers and DB instance
      window.location.reload();
    } catch (e: any) {
      setTasksDiagError(e?.message || String(e));
    } finally {
      setDangerInProgress(false);
    }
  };

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
          {/* Database Diagnostics */}
          <div css={section}>
            <div css={sectionTitle}>Database</div>
            <div className="small muted" style={{ marginBottom: 8 }}>
              Verifies PouchDB availability and storage access in this browser.
            </div>
            <div css={statsCard} style={{ marginBottom: 12 }}>
              <div css={stat}>
                <div css={statValue}>{dbInfo?.adapter || '—'}</div>
                <div css={statLabel}>Adapter</div>
              </div>
              <div css={stat}>
                <div css={statValue}>{dbInfo?.doc_count ?? '—'}</div>
                <div css={statLabel}>Docs</div>
              </div>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn" onClick={runDbHealthCheck} disabled={checkingDb}>
                {checkingDb ? 'Checking…' : 'Run DB Health Check'}
              </button>
              <button className="btn" onClick={listRootTasks}>
                List Root Tasks
              </button>
              <button className="btn" onClick={createSampleRootTask}>
                Create Sample Root Task
              </button>
              {dbError && (
                <div className="small error-text" style={{ marginLeft: 8 }}>
                  {dbError}
                </div>
              )}
            </div>
            {tasksDiagError && (
              <div className="small error-text" style={{ marginTop: 8 }}>
                {tasksDiagError}
              </div>
            )}
            {rootTasksPreview.length > 0 && (
              <div className="small" style={{ marginTop: 8 }}>
                Root tasks ({rootTasksPreview.length}): {rootTasksPreview.map(t => t.text || '(untitled)').join(', ')}
              </div>
            )}
            <div className="small muted" style={{ marginTop: 8 }}>
              Tip: If this fails, your browser/storage settings (e.g. private mode,
              blocked cookies, or disabled IndexedDB) may prevent saving tasks.
            </div>
          </div>

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

          {/* Danger Zone */}
          <div css={section}>
            <div css={sectionTitle}>Danger Zone</div>
            <div className="small muted" style={{ marginBottom: 8 }}>
              Irreversible actions for troubleshooting storage or state issues.
            </div>
            <button className="btn danger" onClick={resetDatabase} disabled={dangerInProgress}>
              {dangerInProgress ? 'Resetting…' : 'Reset Local Database'}
            </button>
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
