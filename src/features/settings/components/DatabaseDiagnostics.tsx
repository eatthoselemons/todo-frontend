/** @jsxImportSource @emotion/react */
import React, { useState, useEffect } from 'react';
import { css } from '@emotion/react';
import PouchDB from 'pouchdb';
import useTaskHooks from '../../tasks/hooks/useTaskHooks';
import { Task, ROOT_ID } from '../../tasks/domain/Task';

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

  const { getAllTasks, processBulkChanges } = useTaskHooks();
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [preventDelete, setPreventDelete] = useState(false);

  const handleBackup = async () => {
    setBackupStatus('Exporting...');
    try {
      const tasks = await getAllTasks();
      // Get rewards progress too if possible, but let's stick to tasks for now as requested
      // We strip _rev so it can be imported cleanly into any DB
      const backupData = {
        timestamp: Date.now(),
        type: 'todo-app-backup',
        tasks: tasks.map(t => {
          const { _rev, ...rest } = t as any;
          return rest;
        })
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `todo-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupStatus('Export complete!');
      setTimeout(() => setBackupStatus(null), 3000);
    } catch (e: any) {
      setBackupStatus(`Export failed: ${e.message}`);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('WARNING: This will update tasks from the backup.' + (preventDelete ? '' : ' TASKS NOT IN THE BACKUP WILL BE DELETED.') + ' This action cannot be undone. Are you sure?')) {
      e.target.value = ''; // Reset input
      return;
    }

    setBackupStatus('Restoring...');
    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (backup.type !== 'todo-app-backup' || !Array.isArray(backup.tasks)) {
        throw new Error('Invalid backup file format');
      }

      const backupTasks = backup.tasks as Task[];
      const currentTasks = await getAllTasks();
      
      const toDelete: Task[] = [];
      const toSave: Task[] = [];
      
      // 1. Identify tasks to delete (in DB but not in backup)
      if (!preventDelete) {
        const backupIds = new Set(backupTasks.map(t => t.id));
        for (const task of currentTasks) {
          if (!backupIds.has(task.id)) {
            toDelete.push(task);
          }
        }
      }

      // 2. Identify tasks to save (update existing or create new)
      const currentTaskMap = new Map(currentTasks.map(t => [t.id, t]));
      
      for (const backupTask of backupTasks) {
        const currentTask = currentTaskMap.get(backupTask.id);
        
        // Prepare task object (ensure it matches Task class structure if needed)
        // We trust the backup structure matches roughly
        const taskToSave: any = { ...backupTask, type: 'task' };
        
        if (currentTask) {
          // Update: preserve current _rev
          taskToSave._rev = currentTask._rev;
        } else {
          // Create: ensure no _rev (should be stripped already but double check)
          delete taskToSave._rev;
        }
        
        toSave.push(taskToSave);
      }

      await processBulkChanges(toSave, toDelete);
      
      setBackupStatus(`Restored ${toSave.length} tasks (${toDelete.length} deleted)`);
      // Refresh DB info
      const info = await db!.info();
      setDbInfo({ adapter: (info as any).adapter, doc_count: (info as any).doc_count });
      
    } catch (e: any) {
      console.error(e);
      setBackupStatus(`Restore failed: ${e.message}`);
    } finally {
       e.target.value = ''; // Reset input so same file can be selected again
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
      <div className="row" style={{ gap: 8, marginBottom: 16 }}>
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

      <div css={sectionTitleStyle} style={{ marginTop: 24 }}>Backup & Restore</div>
      
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
          <input 
            type="checkbox" 
            checked={preventDelete} 
            onChange={e => setPreventDelete(e.target.checked)}
            style={{ marginRight: 8, width: 16, height: 16 }}
          />
          <span className="small">Prevent deletion (Merge backup with existing tasks)</span>
        </label>
      </div>

      <div className="row" style={{ gap: 8 }}>
        <button className="btn" onClick={handleBackup}>
          Export Backup
        </button>
        <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block' }}>
           <button className="btn">Import Backup</button>
           <input 
             type="file" 
             accept=".json" 
             onChange={handleRestore}
             style={{ 
               position: 'absolute', 
               top: 0, 
               left: 0, 
               opacity: 0, 
               width: '100%', 
               height: '100%', 
               cursor: 'pointer' 
             }} 
           />
        </div>
        {backupStatus && (
           <div className="small muted" style={{ marginLeft: 8, alignSelf: 'center' }}>
             {backupStatus}
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
