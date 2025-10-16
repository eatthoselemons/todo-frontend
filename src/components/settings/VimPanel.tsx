/** @jsxImportSource @emotion/react */
import React from 'react';
import { css } from '@emotion/react';
import { useVimSettings } from '../../context/VimSettingsContext';

const sectionTitle = css`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
`;

const checkboxContainer = css`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
`;

const textareaStyle = css`
  width: 100%;
  min-height: 200px;
  font-family: monospace;
  font-size: 13px;
  resize: vertical;
  white-space: pre;
  overflow-wrap: normal;
  overflow-x: auto;
  background-color: #1e1e1e;
  color: #d4d4d4;
  border: 1px solid #444;
  padding: 8px;
  border-radius: 4px;
`;

const infoBox = css`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 12px;
  font-size: 12px;
  margin-bottom: 16px;
  color: var(--muted);

  code {
    background: rgba(255, 255, 255, 0.1);
    padding: 2px 4px;
    border-radius: 2px;
    font-size: 11px;
  }

  ul {
    margin: 8px 0 0 0;
    padding-left: 20px;
  }

  li {
    margin: 4px 0;
  }
`;

const buttonGroup = css`
  display: flex;
  gap: 8px;
  margin-top: 16px;
`;

export const VimPanel: React.FC = () => {
  const { settings, updateSettings } = useVimSettings();
  const [customCommands, setCustomCommands] = React.useState(settings.customCommands);
  const [vimEnabled, setVimEnabled] = React.useState(settings.enabled);

  const handleSave = async () => {
    await updateSettings({
      enabled: vimEnabled,
      customCommands,
    });
  };

  const handleReset = () => {
    const defaultCommands = `" Example vim commands:
" Map jj to escape in insert mode
:imap jj <Esc>

" Map leader key combinations
:nmap <Space> <Leader>
`;
    setCustomCommands(defaultCommands);
  };

  return (
    <div>
      <div css={sectionTitle}>Vim Mode Settings</div>

      <div css={checkboxContainer}>
        <input
          type="checkbox"
          checked={vimEnabled}
          onChange={(e) => setVimEnabled(e.target.checked)}
          id="vim-enabled"
        />
        <label htmlFor="vim-enabled" style={{ cursor: 'pointer' }}>
          Enable Vim mode in YAML editor
        </label>
      </div>

      <div css={sectionTitle}>Custom Vim Commands</div>

      <div css={infoBox}>
        <strong>Note:</strong> This is a regular textarea (vim mode is NOT active here). Custom commands will apply to the YAML editor only.
        <br /><br />
        <strong>Supported Commands:</strong>
        <ul>
          <li><code>:map</code>, <code>:nmap</code>, <code>:imap</code>, <code>:vmap</code> - Create key mappings</li>
          <li><code>:noremap</code>, <code>:nnoremap</code>, <code>:inoremap</code>, <code>:vnoremap</code> - Non-recursive mappings</li>
          <li>Use <code>&lt;Esc&gt;</code>, <code>&lt;CR&gt;</code>, <code>&lt;Leader&gt;</code> for special keys</li>
          <li>Comments start with <code>"</code></li>
        </ul>
      </div>

      <textarea
        css={textareaStyle}
        value={customCommands}
        onChange={(e) => setCustomCommands(e.target.value)}
        spellCheck={false}
        placeholder="Enter custom vim commands..."
      />

      <div css={buttonGroup}>
        <button className="btn" onClick={handleReset}>
          Reset to Default
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn primary" onClick={handleSave}>
          Save Changes
        </button>
      </div>
    </div>
  );
};
