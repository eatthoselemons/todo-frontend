import React, { useEffect, useState } from "react";
import { TaskID } from "./domain/Task";
import useTaskHooks from "./hooks/useTaskHooks";
import { useTaskContext } from "./context/TaskContext";
import TreeView from "./components/TreeView";
import TodayUpcoming from "./components/TodayUpcoming";
import CompletedToday from "./components/CompletedToday";
import History from "./components/History";
import DensityMenu from "./components/DensityMenu";
import { AddTaskModal } from "./components/AddTaskModal";
import "./styles/app.css";

const App: React.FC = () => {
  const [taskIds, setTaskIds] = useState<TaskID[]>([]);
  const [filterText, setFilterText] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandAllTrigger, setExpandAllTrigger] = useState(0);
  const [collapseAllTrigger, setCollapseAllTrigger] = useState(0);
  const [expandToLevelTrigger, setExpandToLevelTrigger] = useState<{level: number, trigger: number} | null>(null);
  const { getRootTaskIds } = useTaskHooks();
  const { db } = useTaskContext();

  useEffect(() => {
    getRootTaskIds().then(setTaskIds);
  }, []);

  useEffect(() => {
    const changes = db
      .changes({
        since: "now",
        live: true,
      })
      .on("change", () => {
        getRootTaskIds().then(setTaskIds);
      });

    return () => changes.cancel();
  }, [db, getRootTaskIds]);

  return (
    <div className="page">
      <div className="header card">
        <div className="badge">Todo App</div>
        <div>Tree Focused</div>
        <div className="spacer"></div>
        <DensityMenu
          onExpandAll={() => setExpandAllTrigger(prev => prev + 1)}
          onCollapseAll={() => setCollapseAllTrigger(prev => prev + 1)}
          onExpandToLevel={(level) => setExpandToLevelTrigger(prev => ({level, trigger: (prev?.trigger || 0) + 1}))}
        />
        <button className="btn" onClick={() => setShowAddModal(true)}>
          + Add Task
        </button>
      </div>

      <div className="layout">
        <div className="card">
          <div className="toolbar">
            <input
              type="search"
              style={{ padding: "6px 10px", width: "260px" }}
              placeholder="Filter or jump (e.g. 'sewing tote')"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
            <div className="spacer"></div>
            <div className="legend small muted">
              <span className="status-chip status-not_started">
                <span className="dot"></span> Not
              </span>
              <span className="status-chip status-in_progress">
                <span className="dot"></span> Progress
              </span>
              <span className="status-chip status-blocked">
                <span className="dot"></span> Blocked
              </span>
              <span className="status-chip status-done">
                <span className="dot"></span> Done
              </span>
            </div>
          </div>

          <TreeView
            rootTaskIds={taskIds}
            expandAllTrigger={expandAllTrigger}
            collapseAllTrigger={collapseAllTrigger}
            expandToLevelTrigger={expandToLevelTrigger}
          />
        </div>

        <div>
          <TodayUpcoming />
          <CompletedToday />
          <History />
        </div>
      </div>

      <AddTaskModal
        parentTaskId="root"
        showAddModal={showAddModal}
        setShowAddModal={setShowAddModal}
      />
    </div>
  );
};

export default App;