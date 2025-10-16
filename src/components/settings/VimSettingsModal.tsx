import React, { useState, useEffect } from 'react';
import { useVimSettings } from '../../context/VimSettingsContext';

interface VimSettingsModalProps {
  showModal: boolean;
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
  onClose?: () => void;
}

export const VimSettingsModal: React.FC<VimSettingsModalProps> = ({
  showModal,
  setShowModal,
  onClose,
}) => {
  const { settings, updateSettings } = useVimSettings();
  const [customCommands, setCustomCommands] = useState(settings.customCommands);
  const [vimEnabled, setVimEnabled] = useState(settings.enabled);
  const [successMessage, setSuccessMessage] = useState<string | undefined>();

  useEffect(() => {
    if (showModal) {
      setCustomCommands(settings.customCommands);
      setVimEnabled(settings.enabled);
      setSuccessMessage(undefined);
    }
  }, [showModal, settings]);

  const close = () => {
    onClose?.();
    setShowModal(false);
    setSuccessMessage(undefined);
  };

  const handleSave = async () => {
    await updateSettings({
      enabled: vimEnabled,
      customCommands,
    });
    setSuccessMessage('Settings saved successfully!');
    setTimeout(() => {
      setSuccessMessage(undefined);
    }, 2000);
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

  if (!showModal) return null;

  return (
    <div className="overlay-dark" onClick={close}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '700px', width: '90%', maxHeight: '80vh' }}
      >
        <div className="modal-header">
          <div className="modal-title">Vim Settings</div>
          <div className="spacer"></div>
          <span className="muted modal-close" onClick={close}>
            ✕
          </span>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={vimEnabled}
              onChange={(e) => setVimEnabled(e.target.checked)}
            />
            <span>Enable Vim mode</span>
          </label>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Custom Vim Commands
          </label>
          <textarea
            className="input-full"
            value={customCommands}
            onChange={(e) => setCustomCommands(e.target.value)}
            style={{
              fontFamily: 'monospace',
              fontSize: '13px',
              minHeight: '300px',
              resize: 'vertical',
              whiteSpace: 'pre',
              overflowWrap: 'normal',
              overflowX: 'auto',
              backgroundColor: '#1e1e1e',
              color: '#d4d4d4',
              border: '1px solid #444',
              padding: '8px',
            }}
            spellCheck={false}
            placeholder="Enter custom vim commands..."
          />
        </div>

        {successMessage && (
          <div
            className="small"
            style={{
              marginBottom: '12px',
              padding: '8px',
              backgroundColor: '#efe',
              borderRadius: '4px',
              color: '#060',
            }}
          >
            {successMessage}
          </div>
        )}

        <div style={{ marginBottom: '12px', fontSize: '12px', color: '#888' }}>
          <strong>Supported Commands:</strong>
          <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
            <li><code>:map</code>, <code>:nmap</code>, <code>:imap</code>, <code>:vmap</code> - Create key mappings</li>
            <li><code>:noremap</code>, <code>:nnoremap</code>, <code>:inoremap</code>, <code>:vnoremap</code> - Non-recursive mappings</li>
            <li>Use <code>&lt;Esc&gt;</code>, <code>&lt;CR&gt;</code>, <code>&lt;Leader&gt;</code> for special keys</li>
            <li>Comments start with <code>"</code></li>
          </ul>
          <div style={{ marginTop: '8px' }}>
            <strong>Examples:</strong>
            <pre style={{
              backgroundColor: '#2a2a2a',
              padding: '8px',
              borderRadius: '4px',
              fontSize: '11px',
              overflow: 'auto',
            }}>{`" Map jj to escape
:imap jj <Esc>

" Quick save with leader + w
:nmap <Leader>w :w<CR>

" Clear search highlighting
:nmap <Leader>/ :noh<CR>`}</pre>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={handleReset}>
            Reset to Default
          </button>
          <div className="spacer"></div>
          <button className="btn" onClick={close}>
            Cancel
          </button>
          <button className="btn primary" onClick={handleSave}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
