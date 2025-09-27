import React, { useEffect, useState } from "react";
import { TaskID } from "./domain/Task";
import useTaskHooks from "./hooks/useTaskHooks";
import { useTaskContext } from "./context/TaskContext";
import TreeView from "./components/TreeView";
import TodayUpcoming from "./components/TodayUpcoming";
import "./styles/app.css";

const App: React.FC = () => {
  const [taskIds, setTaskIds] = useState<TaskID[]>([]);
  const [filterText, setFilterText] = useState("");
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

          <TreeView rootTaskIds={taskIds} />
        </div>

        <TodayUpcoming />
      </div>
    </div>
  );
};

export default App;