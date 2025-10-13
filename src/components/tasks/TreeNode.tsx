/** @jsxImportSource @emotion/react */
import React, { useState, useMemo, useCallback } from "react";
import { css } from "@emotion/react";
import { Task, BaseState } from "../../domain/Task";
import useTaskHooks from "../../hooks/useTaskHooks";
import { AddTaskModal } from "./AddTaskModal";
import { SparkleAnimation } from "../effects/SparkleAnimation";
import { useRewardsContext } from "../../context/RewardsContext";

const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

interface TreeNodeProps {
  task: Task;
  depth: number;
  onToggle?: () => void;
  isExpanded: boolean;
  hasChildren: boolean;
  onTaskComplete?: (task: Task) => void;
  onMilestone?: (label: string, value: number) => void;
}

// Dynamic styles that change based on depth
const nodeStyle = (depth: number) => css`
  padding: 0;
  border-radius: 8px;
  margin-bottom: 2px;
  padding-left: ${depth > 0 ? depth * 24 : 0}px;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`;

const chevronStyle = (depth: number, hasChildren: boolean) => css`
  width: 16px;
  text-align: center;
  opacity: ${hasChildren ? 0.7 : 0};
  cursor: ${hasChildren ? 'pointer' : 'default'};
  user-select: none;
  margin-left: ${depth > 0 ? depth * 12 : 0}px;
`;

// Styles for hidden/visible content using CSS instead of conditional rendering
const drawerStyle = (isOpen: boolean) => css`
  display: ${isOpen ? 'block' : 'none'};
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  margin-top: 8px;
`;

const TreeNode: React.FC<TreeNodeProps> = ({
  task,
  depth,
  onToggle,
  isExpanded,
  hasChildren,
  onTaskComplete,
  onMilestone,
}) => {
  const [showDrawer, setShowDrawer] = useState(false);
  const [yamlContent, setYamlContent] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [sparkleTrigger, setSparkleTrigger] = useState(0);
  const [sparklePos, setSparklePos] = useState({ x: 0, y: 0 });
  const { updateTask, deleteTask } = useTaskHooks();
  const { settings, emit, progress } = useRewardsContext();

  // Memoized computations
  const dueStatus = useMemo(() => {
    if (!task.dueDate) return null;

    const due = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((due.getTime() - today.getTime()) / MILLISECONDS_PER_DAY);

    if (diffDays < 0) return { text: "Overdue", className: "overdue" };
    if (diffDays === 0) return { text: "Today", className: "today" };
    if (diffDays <= 7) return { text: `Due in ${diffDays}d`, className: "upcoming" };
    return { text: `Due ${task.dueDate}`, className: "upcoming" };
  }, [task.dueDate]);

  const statusLabel = useMemo(() => {
    switch (task.internalState) {
      case BaseState.NOT_STARTED: return "Not started";
      case BaseState.IN_PROGRESS: return "In progress";
      case BaseState.BLOCKED: return "Blocked";
      case BaseState.DONE: return "Done";
      default: return "Not started";
    }
  }, [task.internalState]);

  const stateClass = useMemo(() =>
    task.internalState !== BaseState.NOT_STARTED ? `is-${task.internalState}` : "",
    [task.internalState]
  );

  const handleStatusClick = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
    const previousState = task.internalState;
    task.nextState();

    // Emit theme event when task is completed
    if (task.internalState === BaseState.DONE && settings.enabled) {
      const rect = e.currentTarget.getBoundingClientRect();

      // Emit task complete event - theme will handle effects and points
      await emit('task:complete', {
        taskId: task.id,
        isRoot: depth === 0,
        clientPos: {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        },
        targetElement: e.currentTarget as HTMLElement
      });

      // Check for milestones
      const nextTotalTasks = progress.totalTasks + 1;
      const nextLevel = Math.floor((progress.points + 10) / 100) + 1;

      if (onMilestone && (nextTotalTasks % 5 === 0 || nextLevel > progress.level)) {
        if (nextLevel > progress.level) {
          onMilestone(`Level ${nextLevel}!`, 100);
        } else {
          onMilestone(`${nextTotalTasks} Tasks!`, Math.min(100, (nextTotalTasks % 10) * 20));
        }
      }
    }

    // Check if task is being marked as done and it's a root task
    if (task.internalState === BaseState.DONE && depth === 0 && onTaskComplete) {
      // Trigger grace period instead of immediate update
      onTaskComplete(task);
    } else {
      // Normal update for non-root or non-complete transitions
      await updateTask(task);
    }
  }, [task, updateTask, depth, onTaskComplete, onMilestone, settings.enabled, emit, progress]);

  const handleDelete = useCallback(async () => {
    if (window.confirm(`Delete "${task.text}" and all its children?`)) {
      await deleteTask(task.id);
    }
  }, [task.id, task.text, deleteTask]);

  const handleShowAddModal = useCallback(() => setShowAddModal(true), []);
  const handleToggleDrawer = useCallback(() => setShowDrawer(prev => !prev), []);
  const handleCloseDrawer = useCallback(() => setShowDrawer(false), []);
  const handleYamlChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setYamlContent(e.target.value);
  }, []);

  const defaultYaml = useMemo(() =>
    `text: ${task.text}\nstatus: ${task.internalState}\ndue: ${task.dueDate || ""}`,
    [task.text, task.internalState, task.dueDate]
  );

  return (
    <>
      <div
        className={`node ${depth === 0 ? "root" : ""}`}
        css={nodeStyle(depth)}
      >
        <div className={`node-row ${stateClass}`} style={depth > 0 ? { position: 'relative' } : undefined}>
          <div
            css={chevronStyle(depth, hasChildren)}
            onClick={hasChildren ? onToggle : undefined}
          >
            {hasChildren ? (isExpanded ? "▾" : "▸") : ""}
          </div>
          <div
            className={`status-chip status-${task.internalState}`}
            onClick={handleStatusClick}
            title="Click to cycle status"
          >
            <span className="dot"></span>
            {statusLabel}
          </div>
          <div className="node-title">{task.text}</div>
          {dueStatus && (
            <span className={`due ${dueStatus.className}`}>{dueStatus.text}</span>
          )}
          <div className="actions">
            <button className="text-btn" onClick={handleShowAddModal}>
              + Child
            </button>
            <button className="text-btn" onClick={handleToggleDrawer}>
              YAML
            </button>
            <button className="text-btn danger" onClick={handleDelete}>
              Delete
            </button>
          </div>
        </div>

        {/* Using CSS to hide/show drawer for better performance */}
        <div css={drawerStyle(showDrawer)}>
          <div className="row" style={{ marginBottom: "8px" }}>
            <div className="muted small">Edit task properties (YAML format)</div>
            <div className="spacer"></div>
          </div>
          <textarea
            className="yaml"
            value={yamlContent || defaultYaml}
            onChange={handleYamlChange}
            spellCheck={false}
          />
          <div className="row" style={{ marginTop: "8px" }}>
            <div className="spacer"></div>
            <button className="btn" onClick={handleCloseDrawer}>
              Cancel
            </button>
            <button className="btn primary">Apply</button>
          </div>
        </div>
      </div>

      <AddTaskModal
        parentTaskId={task.id}
        showAddModal={showAddModal}
        setShowAddModal={setShowAddModal}
      />

      {settings.enabled && settings.animations && (
        <SparkleAnimation
          trigger={sparkleTrigger}
          intensity={settings.intensity === 'minimal' ? 'minimal' : settings.intensity === 'extra' ? 'extra' : 'standard'}
          x={sparklePos.x}
          y={sparklePos.y}
        />
      )}
    </>
  );
};

export default TreeNode;
