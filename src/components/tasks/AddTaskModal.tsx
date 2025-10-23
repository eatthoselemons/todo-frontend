import React, { useState } from "react";
import { TaskId } from "../../features/tasks/domain/ValueObjects";
import { useTaskCommands } from "../../features/tasks/hooks/useTaskCommands";

interface AddTaskModalProps {
  showAddModal: boolean;
  setShowAddModal: React.Dispatch<React.SetStateAction<boolean>>;
  parentTaskId: TaskId;
  onClose?: () => void;
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

  const { createTask } = useTaskCommands();

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
        await createTask({
          text: newTaskName,
          parentId: parentTaskId,
        });
        setTaskName("");
        close();
      } catch (e: any) {
        console.error("Error creating task:", e);
        setHasTaskNameError(true);
        const msg = (e && (e.message || e.name)) || "";
        if (/IndexedDB|blocked|disabled|denied|SecurityError/i.test(msg)) {
          setTaskNameError(
            "Unable to save data. Your browser is blocking local storage (IndexedDB). Try disabling private browsing or adjusting site storage settings."
          );
        } else {
          setTaskNameError("Failed to create task. Please try again.");
        }
      }
    })();
  };

  if (!showAddModal) return null;

  return (
    <div className="overlay-dark" onClick={close}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "500px", width: "90%" }}>
        <div className="modal-header">
          <div className="modal-title">Add New Task</div>
          <div className="spacer"></div>
          <span className="muted modal-close" onClick={close}>
            ✕
          </span>
        </div>

        <div className="input-container">
          <input
            type="text"
            className={`input-full ${hasTaskNameError ? "error" : ""}`}
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
            autoFocus
          />
          {hasTaskNameError && (
            <div className="small error-text" style={{ marginTop: "6px" }}>
              {taskNameError}
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={close}>
            Cancel
          </button>
          <button className="btn primary" onClick={submit}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
};
