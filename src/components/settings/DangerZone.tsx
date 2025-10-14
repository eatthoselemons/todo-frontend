/** @jsxImportSource @emotion/react */
import React, { useState } from 'react';
import { css } from '@emotion/react';
import PouchDB from 'pouchdb';

interface DangerZoneProps {
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

export const DangerZone: React.FC<DangerZoneProps> = ({ db }) => {
  const [dangerInProgress, setDangerInProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetDatabase = async () => {
    if (!window.confirm('This will delete ALL data in the local database for this app on this browser. Continue?')) {
      return;
    }

    setDangerInProgress(true);
    setError(null);

    try {
      await db!.destroy();
      // Reload to reinitialize providers and DB instance
      window.location.reload();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setDangerInProgress(false);
    }
  };

  return (
    <div css={sectionStyle}>
      <div css={sectionTitleStyle}>Danger Zone</div>
      <div className="small muted" style={{ marginBottom: 8 }}>
        Irreversible actions for troubleshooting storage or state issues.
      </div>
      <button className="btn danger" onClick={resetDatabase} disabled={dangerInProgress}>
        {dangerInProgress ? 'Resetting…' : 'Reset Local Database'}
      </button>
      {error && (
        <div className="small error-text" style={{ marginTop: 8 }}>
          {error}
        </div>
      )}
    </div>
  );
};
