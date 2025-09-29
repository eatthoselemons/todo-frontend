/** @jsxImportSource @emotion/react */
import React, { useEffect, useState, useCallback } from "react";
import { css, keyframes } from "@emotion/react";
import { Task, TaskID } from "../domain/Task";

interface ToastItem {
  id: string;
  task: Task;
  message: string;
  timeRemaining?: number;
}

interface GracePeriodToastProps {
  toasts: ToastItem[];
  onUndo: (taskId: TaskID) => void;
  onExpire: (taskId: TaskID) => void;
}

const slideIn = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const slideOut = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
`;

const toastContainer = css`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const toastStyle = (isExiting: boolean) => css`
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 16px;
  box-shadow: var(--shadow);
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 300px;
  animation: ${isExiting ? slideOut : slideIn} 0.3s ease-in-out;
`;

const progressBar = css`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--border);
  border-radius: 0 0 var(--radius) var(--radius);
  overflow: hidden;
`;

const liquidFill = (progress: number) => css`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: ${progress}%;
  background: linear-gradient(90deg, var(--accent), var(--accent-2));
  transition: width 0.1s linear;

  &::after {
    content: '';
    position: absolute;
    top: -2px;
    right: -10px;
    width: 20px;
    height: 7px;
    background: inherit;
    border-radius: 50%;
    animation: wave 1s ease-in-out infinite;
  }

  @keyframes wave {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-2px); }
  }
`;

const undoButton = css`
  background: transparent;
  color: var(--accent);
  border: 1px solid var(--accent);
  border-radius: 6px;
  padding: 4px 12px;
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
  transition: all 0.2s;

  &:hover {
    background: var(--accent);
    color: white;
  }
`;

const GRACE_PERIOD = 5000; // 5 seconds
const UPDATE_INTERVAL = 100; // Update every 100ms for smooth progress

export const GracePeriodToast: React.FC<GracePeriodToastProps> = ({
  toasts,
  onUndo,
  onExpire,
}) => {
  const [localToasts, setLocalToasts] = useState<Map<string, ToastItem>>(new Map());
  const [exitingToasts, setExitingToasts] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Update local toasts when props change
    const newToasts = new Map<string, ToastItem>();
    toasts.forEach(toast => {
      if (!localToasts.has(toast.id)) {
        // New toast, set initial time
        newToasts.set(toast.id, { ...toast, timeRemaining: GRACE_PERIOD });
      } else {
        // Existing toast, keep current time
        newToasts.set(toast.id, localToasts.get(toast.id)!);
      }
    });
    setLocalToasts(newToasts);
  }, [toasts]);

  useEffect(() => {
    if (localToasts.size === 0) return;

    const interval = setInterval(() => {
      setLocalToasts(prev => {
        const updated = new Map(prev);
        let hasChanges = false;

        updated.forEach((toast, id) => {
          if (exitingToasts.has(id)) return;

          const newTime = toast.timeRemaining - UPDATE_INTERVAL;
          if (newTime <= 0) {
            // Time's up, trigger expiry
            setExitingToasts(prev => new Set(prev).add(id));
            setTimeout(() => {
              onExpire(toast.task.id);
              setExitingToasts(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
              });
            }, 300); // Wait for exit animation
            updated.delete(id);
            hasChanges = true;
          } else {
            updated.set(id, { ...toast, timeRemaining: newTime });
            hasChanges = true;
          }
        });

        return hasChanges ? updated : prev;
      });
    }, UPDATE_INTERVAL);

    return () => clearInterval(interval);
  }, [localToasts, exitingToasts, onExpire]);

  const handleUndo = useCallback((id: string, taskId: TaskID) => {
    setExitingToasts(prev => new Set(prev).add(id));
    setTimeout(() => {
      onUndo(taskId);
      setLocalToasts(prev => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
      setExitingToasts(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300);
  }, [onUndo]);

  if (localToasts.size === 0 && exitingToasts.size === 0) return null;

  return (
    <div css={toastContainer}>
      {Array.from(localToasts.values()).map(toast => (
        <div key={toast.id} css={toastStyle(exitingToasts.has(toast.id))}>
          <div style={{ flex: 1 }}>
            <div>{toast.message}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
              {((toast.timeRemaining || 0) / 1000).toFixed(1)}s remaining
            </div>
          </div>
          <button
            css={undoButton}
            onClick={() => handleUndo(toast.id, toast.task.id)}
          >
            Undo
          </button>
          <div css={progressBar}>
            <div css={liquidFill(((toast.timeRemaining || 0) / GRACE_PERIOD) * 100)} />
          </div>
        </div>
      ))}
    </div>
  );
};