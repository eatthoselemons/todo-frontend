import React, { useState, useEffect, useRef } from "react";
import { Task } from "../../domain/Task";
import { useYamlExport } from "../../features/tasks/hooks/useYamlExport";
import { YamlEditor, YamlEditorRef } from "../editor/YamlEditor";

interface YamlModalProps {
  showModal: boolean;
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
  task: Task;
  onClose?: () => void;
}

export const YamlModal: React.FC<YamlModalProps> = ({
  showModal,
  setShowModal,
  task,
  onClose,
}) => {
  const [yamlContent, setYamlContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [successMessage, setSuccessMessage] = useState<string | undefined>();
  const { exportTask, importTask } = useYamlExport();
  const editorRef = useRef<YamlEditorRef>(null);
  const loadedTaskIdRef = useRef<string | null>(null);

  // Load YAML when modal opens or when switching to a different task
  useEffect(() => {
    if (showModal && task && loadedTaskIdRef.current !== task.id) {
      setIsLoading(true);
      setError(undefined);
      setSuccessMessage(undefined);
      loadedTaskIdRef.current = task.id;

      exportTask(task)
        .then((yaml) => {
          setYamlContent(yaml);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Error exporting to YAML:", err);
          setError("Failed to export task to YAML");
          setIsLoading(false);
        });
    }
  }, [showModal, task, exportTask]);

  const close = () => {
    onClose?.();
    setShowModal(false);
    setYamlContent("");
    setError(undefined);
    setSuccessMessage(undefined);
    loadedTaskIdRef.current = null;
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(undefined);
    setSuccessMessage(undefined);

    try {
      // Get current value from editor
      const currentYaml = editorRef.current?.getValue() || '';
      await importTask(task, currentYaml);
      setSuccessMessage("Task updated successfully!");
      setIsSaving(false);

      // Don't auto-close - let user close manually or make more edits
    } catch (err: any) {
      console.error("Error importing YAML:", err);
      setError(err.message || "Failed to import YAML. Please check the format.");
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    const currentYaml = editorRef.current?.getValue() || '';
    navigator.clipboard.writeText(currentYaml).then(() => {
      setSuccessMessage("Copied to clipboard!");
      setTimeout(() => setSuccessMessage(undefined), 2000);
    });
  };

  if (!showModal) return null;

  return (
    <div className="overlay-dark" onClick={close}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "900px",
          width: "90%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column"
        }}
      >
        <div className="modal-header">
          <div className="modal-title">Edit Task as YAML</div>
          <div className="spacer"></div>
          <span className="muted modal-close" onClick={close}>
            ✕
          </span>
        </div>

        <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
          <div style={{ marginBottom: "12px", color: "#666", fontSize: "14px" }}>
            Edit the task and its children in YAML format. You can add new children
            at any depth by adding them to the <code>children</code> array.
          </div>

          {isLoading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#666" }}>
              Loading...
            </div>
          ) : (
            <>
              <div style={{ marginBottom: "12px", height: "400px" }}>
                <YamlEditor
                  ref={editorRef}
                  initialValue={yamlContent}
                  style={{ height: "100%" }}
                />
              </div>

              {error && (
                <div
                  className="small error-text"
                  style={{ marginBottom: "12px", padding: "8px", backgroundColor: "#fee", borderRadius: "4px" }}
                >
                  {error}
                </div>
              )}

              {successMessage && (
                <div
                  className="small"
                  style={{
                    marginBottom: "12px",
                    padding: "8px",
                    backgroundColor: "#efe",
                    borderRadius: "4px",
                    color: "#060",
                  }}
                >
                  {successMessage}
                </div>
              )}

              <div style={{ marginBottom: "12px", fontSize: "12px", color: "#888" }}>
                <strong>Tips:</strong>
                <ul style={{ margin: "4px 0", paddingLeft: "20px" }}>
                  <li>Vim mode is enabled - use Esc to enter normal mode, i/a to insert</li>
                  <li>Add new children by adding items to the <code>children</code> array</li>
                  <li>Nest children to arbitrary depth using nested <code>children</code> arrays</li>
                  <li>Valid states: not_started, in_progress, blocked, done</li>
                  <li>Tasks are matched by their <code>text</code> field</li>
                  <li>Removing a child from the YAML will delete it and all its descendants</li>
                </ul>
              </div>
            </>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={handleCopy} disabled={isLoading || isSaving}>
            Copy
          </button>
          <div className="spacer"></div>
          <button className="btn" onClick={close}>
            Cancel
          </button>
          <button
            className="btn primary"
            onClick={handleSave}
            disabled={isLoading || isSaving}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};
