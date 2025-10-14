/** @jsxImportSource @emotion/react */
import React, { useState, useEffect } from 'react';
import { css } from '@emotion/react';
import PouchDB from 'pouchdb';
import useTaskHooks from '../../hooks/useTaskHooks';
import { Task, ROOT_ID } from '../../domain/Task';

interface DatabaseDiagnosticsProps {
  db: PouchDB.Database;
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

export const DatabaseDiagnostics: React.FC<DatabaseDiagnosticsProps> = ({ db }) => {
  const { getRootTasks, createTask } = useTaskHooks();
  const [dbInfo, setDbInfo] = useState<{ adapter?: string; doc_count?: number } | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [checkingDb, setCheckingDb] = useState(false);
  const [rootTasksPreview, setRootTasksPreview] = useState<Array<{ id: string; text: string }>>([]);
  const [tasksDiagError, setTasksDiagError] = useState<string | null>(null);

  useEffect(() => {
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
  }, [db]);

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

  return (
    <div css={sectionStyle}>
      <div css={sectionTitleStyle}>Database</div>
      <div className="small muted" style={{ marginBottom: 8 }}>
        Verifies PouchDB availability and storage access in this browser.
      </div>
      <div css={statsCardStyle} style={{ marginBottom: 12 }}>
        <div css={statStyle}>
          <div css={statValueStyle}>{dbInfo?.adapter || '—'}</div>
          <div css={statLabelStyle}>Adapter</div>
        </div>
        <div css={statStyle}>
          <div css={statValueStyle}>{dbInfo?.doc_count ?? '—'}</div>
          <div css={statLabelStyle}>Docs</div>
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
  );
};
