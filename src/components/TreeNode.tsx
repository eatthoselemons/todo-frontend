import React, { useState } from "react";
import { Task, BaseState } from "../domain/Task";
import useTaskHooks from "../hooks/useTaskHooks";
import { AddTaskModal } from "./AddTaskModal";

const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

interface TreeNodeProps {
  task: Task;
  depth: number;
  onToggle?: () => void;
  isExpanded: boolean;
  hasChildren: boolean;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  task,
  depth,
  onToggle,
  isExpanded,
  hasChildren,
}) => {
  const [showDrawer, setShowDrawer] = useState(false);
  const [yamlContent, setYamlContent] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const { updateTask, deleteTask } = useTaskHooks();

  const handleStatusClick = async () => {
    task.nextState();
    await updateTask(task);
  };

  const handleDelete = async () => {
    if (window.confirm(`Delete "${task.text}" and all its children?`)) {
      await deleteTask(task.id);
    }
  };

  const getDueStatus = (dueDate?: string) => {
    if (!dueDate) return null;

    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((due.getTime() - today.getTime()) / MILLISECONDS_PER_DAY);

    if (diffDays < 0) return { text: "Overdue", className: "overdue" };
    if (diffDays === 0) return { text: "Today", className: "today" };
    if (diffDays <= 7) return { text: `Due in ${diffDays}d`, className: "upcoming" };
    return { text: `Due ${dueDate}`, className: "upcoming" };
  };

  const dueStatus = getDueStatus(task.dueDate);

  const getStatusLabel = (state: BaseState) => {
    switch (state) {
      case BaseState.NOT_STARTED: return "Not started";
      case BaseState.IN_PROGRESS: return "In progress";
      case BaseState.BLOCKED: return "Blocked";
      case BaseState.DONE: return "Done";
      default: return "Not started";
    }
  };

  const stateClass = task.internalState !== BaseState.NOT_STARTED ? `is-${task.internalState}` : "";
  const indentPadding = depth > 0 ? depth * 24 : 0;
  const chevronMargin = depth > 0 ? depth * 12 : 0;

  return (
    <>
      <div
        className={`node ${depth === 0 ? "root" : ""}`}
        style={depth > 0 ? { paddingLeft: `${indentPadding}px` } : undefined}
      >
        <div className={`node-row ${stateClass}`} style={depth > 0 ? { position: 'relative' } : undefined}>
          <div
            className="chev"
            onClick={hasChildren ? onToggle : undefined}
            style={depth > 0 ? { marginLeft: `${chevronMargin}px` } : undefined}
          >
            {hasChildren ? (isExpanded ? "▾" : "▸") : ""}
          </div>
          <div
            className={`status-chip status-${task.internalState}`}
            onClick={handleStatusClick}
            title="Click to cycle status"
          >
            <span className="dot"></span>
            {getStatusLabel(task.internalState)}
          </div>
          <div className="node-title">{task.text}</div>
          {dueStatus && (
            <span className={`due ${dueStatus.className}`}>{dueStatus.text}</span>
          )}
          <div className="actions">
            <button className="text-btn" onClick={() => setShowAddModal(true)}>
              + Child
            </button>
            <button className="text-btn" onClick={() => setShowDrawer(!showDrawer)}>
              YAML
            </button>
            <button className="text-btn" onClick={handleDelete} style={{ color: "#f87171" }}>
              Delete
            </button>
          </div>
        </div>

        {showDrawer && (
          <div className="drawer">
            <div className="row" style={{ marginBottom: "8px" }}>
              <div className="muted small">Edit task properties (YAML format)</div>
              <div className="spacer"></div>
            </div>
            <textarea
              className="yaml"
              value={yamlContent || `text: ${task.text}\nstatus: ${task.internalState}\ndue: ${task.dueDate || ""}`}
              onChange={(e) => setYamlContent(e.target.value)}
              spellCheck={false}
            />
            <div className="row" style={{ marginTop: "8px" }}>
              <div className="spacer"></div>
              <button className="btn" onClick={() => setShowDrawer(false)}>
                Cancel
              </button>
              <button className="btn primary">Apply</button>
            </div>
          </div>
        )}
      </div>

      <AddTaskModal
        parentTaskId={task.id}
        showAddModal={showAddModal}
        setShowAddModal={setShowAddModal}
      />
    </>
  );
};

export default TreeNode;