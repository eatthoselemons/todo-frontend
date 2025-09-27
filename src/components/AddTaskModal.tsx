import React, { useState } from "react";
import { Task, TaskID } from "../domain/Task";
import useTaskHooks from "../hooks/useTaskHooks";

interface AddTaskModalProps {
  showAddModal: boolean;
  setShowAddModal: React.Dispatch<React.SetStateAction<boolean>>;
  parentTaskId: TaskID;
  onClose?: () => {};
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  showAddModal,
  setShowAddModal,
  parentTaskId,
  onClose,
}) => {
  const [newTaskName, setTaskName] = useState("");
  const [hasTaskNameError, setHasTaskNameError] = useState(false);
  const [taskNameError, setTaskNameError] = useState<string | undefined>();

  const { createTask } = useTaskHooks();

  const close = () => {
    onClose?.();
    setShowAddModal(false);
    setTaskName("");
    setHasTaskNameError(false);
    setTaskNameError(undefined);
  };

  const submit = () => {
    if (!newTaskName || newTaskName.trim() === "") {
      setHasTaskNameError(true);
      setTaskNameError("Task name is required");
      return;
    }

    setHasTaskNameError(false);
    setTaskNameError(undefined);

    (async () => {
      try {
        await createTask(new Task(newTaskName), parentTaskId);
        setTaskName("");
        close();
      } catch (e) {
        console.error("Error creating task:", e);
        setHasTaskNameError(true);
        setTaskNameError("Failed to create task. Please try again.");
      }
    })();
  };

  if (!showAddModal) return null;

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 1001,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={close}
      >
        <div
          className="modal-card"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: "500px", width: "90%" }}
        >
          <div className="row" style={{ alignItems: "center", marginBottom: "16px" }}>
            <div className="modal-title">Add New Task</div>
            <div className="spacer"></div>
            <span
              className="muted"
              style={{ cursor: "pointer", fontSize: "20px" }}
              onClick={close}
            >
              ✕
            </span>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <input
              type="text"
              placeholder="Task name"
              value={newTaskName}
              onChange={(e) => {
                setTaskName(e.target.value);
                if (hasTaskNameError) {
                  setHasTaskNameError(false);
                  setTaskNameError(undefined);
                }
              }}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.metaKey &&
                  !e.ctrlKey &&
                  !e.shiftKey &&
                  !e.altKey
                ) {
                  e.preventDefault();
                  submit();
                }
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: "14px",
                border: hasTaskNameError ? "1px solid #f87171" : "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
                borderRadius: "8px",
              }}
              autoFocus
            />
            {hasTaskNameError && (
              <div className="small error-text" style={{ marginTop: "6px" }}>
                {taskNameError}
              </div>
            )}
          </div>

          <div className="row" style={{ justifyContent: "flex-end", gap: "8px" }}>
            <button className="btn" onClick={close}>
              Cancel
            </button>
            <button className="btn primary" onClick={submit}>
              Create
            </button>
          </div>
        </div>
      </div>
    </>
  );
};