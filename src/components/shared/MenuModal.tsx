/** @jsxImportSource @emotion/react */
import React, { useState } from "react";
import { css } from "@emotion/react";
import { TaskID } from "../../domain/Task";
import useTaskHooks from "../../features/tasks/hooks/useTaskHooks";

interface MenuModalProps {
  showMenuModal: boolean;
  setShowMenuModal: React.Dispatch<React.SetStateAction<boolean>>;
  taskId: TaskID;
  onClose?: () => void;
}

const modalOverlay = css`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const modalCard = css`
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow: auto;
`;

const modalHeader = css`
  padding: 16px;
  border-bottom: 1px solid var(--border);
  font-size: 20px;
  font-weight: 500;
`;

const modalContent = css`
  padding: 16px;
`;

const modalActions = css`
  padding: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid var(--border);
`;

const button = css`
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  &.danger {
    border-color: var(--danger);
    color: var(--danger);
  }
`;

export const MenuModal: React.FC<MenuModalProps> = ({
  showMenuModal,
  setShowMenuModal,
  taskId,
  onClose,
}) => {
  const { clearSubTasks } = useTaskHooks();
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    onClose?.();
    setShowMenuModal(false);
  };

  const submit = async () => {
    try {
      setError(null);
      await clearSubTasks(taskId);
    } catch (e) {
      const msg = (e as any)?.message || String(e);
      setError(msg || 'Failed to clear subtasks');
      return;
    }
    close();
  };

  if (!showMenuModal) return null;

  return (
    <div css={modalOverlay} onClick={close}>
      <div css={modalCard} onClick={(e) => e.stopPropagation()}>
        <div css={modalHeader}>Menu</div>
        <div css={modalContent}>
          <div className="small muted" style={{ marginBottom: 8 }}>Task ID</div>
          <div style={{ wordBreak: 'break-all' }}>{taskId}</div>
          {error && (
            <div className="small error-text" style={{ marginTop: 8 }}>{error}</div>
          )}
        </div>
        <div css={modalActions}>
          <button css={button} onClick={close}>
            Cancel
          </button>
          <button css={button} className="danger" onClick={submit}>
            Clear Subtasks
          </button>
        </div>
      </div>
    </div>
  );
};
