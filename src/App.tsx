import React, { useEffect, useState, useCallback } from "react";
import { TaskID, BaseState } from "./domain/Task";
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
  const [doneTaskIds, setDoneTaskIds] = useState<TaskID[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'done'>('active');
  const [filterText, setFilterText] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandAllTrigger, setExpandAllTrigger] = useState(0);
  const [collapseAllTrigger, setCollapseAllTrigger] = useState(0);
  const [expandToLevelTrigger, setExpandToLevelTrigger] = useState<{level: number, trigger: number} | null>(null);
  const { getRootTaskIds, getTaskById } = useTaskHooks();
  const { db } = useTaskContext();

  // Memoized event handlers
  const handleExpandAll = useCallback(() => setExpandAllTrigger(prev => prev + 1), []);
  const handleCollapseAll = useCallback(() => setCollapseAllTrigger(prev => prev + 1), []);
  const handleExpandToLevel = useCallback((level: number) => {
    setExpandToLevelTrigger(prev => ({level, trigger: (prev?.trigger || 0) + 1}));
  }, []);
  const handleShowAddModal = useCallback(() => setShowAddModal(true), []);
  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterText(e.target.value);
  }, []);

  useEffect(() => {
    const loadAndSeparateTasks = async () => {
      const allTaskIds = await getRootTaskIds();
      const activeTasks: TaskID[] = [];
      const doneTasks: TaskID[] = [];

      for (const taskId of allTaskIds) {
        const task = await getTaskById(taskId);
        if (task) {
          if (task.internalState === BaseState.DONE) {
            doneTasks.push(taskId);
          } else {
            activeTasks.push(taskId);
          }
        }
      }

      setTaskIds(activeTasks);
      setDoneTaskIds(doneTasks);
    };

    loadAndSeparateTasks();
  }, [getRootTaskIds, getTaskById]);

  useEffect(() => {
    const changes = db
      .changes({
        since: "now",
        live: true,
      })
      .on("change", async () => {
        const allTaskIds = await getRootTaskIds();
        const activeTasks: TaskID[] = [];
        const doneTasks: TaskID[] = [];

        for (const taskId of allTaskIds) {
          const task = await getTaskById(taskId);
          if (task) {
            if (task.internalState === BaseState.DONE) {
              doneTasks.push(taskId);
            } else {
              activeTasks.push(taskId);
            }
          }
        }

        setTaskIds(activeTasks);
        setDoneTaskIds(doneTasks);
      });

    return () => changes.cancel();
  }, [db, getRootTaskIds, getTaskById]);

  return (
    <div className="page">
      <div className="header card">
        <div className="badge">Todo App</div>
        <div>Tree Focused</div>
        <div className="spacer"></div>
        <DensityMenu
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          onExpandToLevel={handleExpandToLevel}
        />
        <button className="btn" onClick={handleShowAddModal}>
          + Add Task
        </button>
      </div>

      <div className="layout">
        <div className="card">
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'active' ? 'active' : ''}`}
              onClick={() => setActiveTab('active')}
            >
              Active Tasks ({taskIds.length})
            </button>
            <button
              className={`tab ${activeTab === 'done' ? 'active' : ''}`}
              onClick={() => setActiveTab('done')}
            >
              Done ({doneTaskIds.length})
            </button>
            <div className="spacer"></div>
            {activeTab === 'active' && (
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
              </div>
            )}
          </div>

          <div className="toolbar">
            <input
              type="search"
              style={{ padding: "6px 10px", width: "260px" }}
              placeholder={`Filter ${activeTab === 'active' ? 'active tasks' : 'completed tasks'}...`}
              value={filterText}
              onChange={handleFilterChange}
            />
          </div>

          <TreeView
            rootTaskIds={activeTab === 'active' ? taskIds : doneTaskIds}
            expandAllTrigger={expandAllTrigger}
            collapseAllTrigger={collapseAllTrigger}
            expandToLevelTrigger={expandToLevelTrigger}
            loadStrategy={activeTab === 'active' ? 'full' : 'lazy'}
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