import React, { useEffect, useState, useCallback } from "react";
import { TaskID, BaseState, Task } from "./domain/Task";
import useTaskHooks from "./hooks/useTaskHooks";
import { useTaskContext } from "./context/TaskContext";
import TreeView from "./components/TreeView";
import TodayUpcoming from "./components/TodayUpcoming";
import CompletedToday from "./components/CompletedToday";
import History from "./components/History";
import DensityMenu from "./components/DensityMenu";
import { AddTaskModal } from "./components/AddTaskModal";
import { GracePeriodToast } from "./components/GracePeriodToast";
import { SettingsPage } from "./components/SettingsPage";
import { LiquidProgressAnimation } from "./components/LiquidProgressAnimation";
import { useRewardsContext } from "./context/RewardsContext";
import "./styles/app.css";

const App: React.FC = () => {
  const [taskIds, setTaskIds] = useState<TaskID[]>([]);
  const [doneTaskIds, setDoneTaskIds] = useState<TaskID[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'done'>('active');
  const [filterText, setFilterText] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [expandAllTrigger, setExpandAllTrigger] = useState(0);
  const [collapseAllTrigger, setCollapseAllTrigger] = useState(0);
  const [expandToLevelTrigger, setExpandToLevelTrigger] = useState<{level: number, trigger: number} | null>(null);
  const [pendingCompletions, setPendingCompletions] = useState<Array<{id: string; task: Task; message: string}>>([]);
  const [showLiquidProgress, setShowLiquidProgress] = useState(false);
  const [liquidProgressValue, setLiquidProgressValue] = useState(0);
  const [liquidProgressLabel, setLiquidProgressLabel] = useState("");
  const { getRootTaskIds, getTaskById, updateTask } = useTaskHooks();
  const { db } = useTaskContext();
  const { settings, progress } = useRewardsContext();

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

  // Handle milestone animation
  const handleMilestone = useCallback((label: string, value: number) => {
    if (settings.enabled && settings.animations) {
      setLiquidProgressLabel(label);
      setLiquidProgressValue(value);
      setShowLiquidProgress(true);
    }
  }, [settings.enabled, settings.animations]);

  // Handle task completion with grace period
  const handleTaskComplete = useCallback((task: Task) => {
    // Add to pending completions
    const toastId = `toast-${Date.now()}-${task.id}`;
    setPendingCompletions(prev => [...prev, {
      id: toastId,
      task,
      message: `"${task.text}" moving to Done`
    }]);
  }, []);

  // Handle undo from grace period
  const handleUndo = useCallback((taskId: TaskID) => {
    // Find the task and revert its state
    const pending = pendingCompletions.find(p => p.task.id === taskId);
    if (pending) {
      // Revert the task state (it was cycled forward, so cycle 3 times to go back)
      pending.task.nextState(); // DONE -> NOT_STARTED
      pending.task.nextState(); // NOT_STARTED -> IN_PROGRESS
      pending.task.nextState(); // IN_PROGRESS -> BLOCKED
      updateTask(pending.task);

      // Remove from pending
      setPendingCompletions(prev => prev.filter(p => p.task.id !== taskId));
    }
  }, [pendingCompletions, updateTask]);

  // Handle grace period expiry
  const handleExpire = useCallback(async (taskId: TaskID) => {
    // Find the task and actually update it
    const pending = pendingCompletions.find(p => p.task.id === taskId);
    if (pending) {
      await updateTask(pending.task);
      // Remove from pending
      setPendingCompletions(prev => prev.filter(p => p.task.id !== taskId));

      // Check for milestone progress (every 5 tasks or at level boundaries)
      if (settings.enabled && settings.animations) {
        const nextTotalTasks = progress.totalTasks + 1;
        const nextLevel = Math.floor((progress.points + 10) / 100) + 1;

        if (nextTotalTasks % 5 === 0 || nextLevel > progress.level) {
          // Show liquid progress animation for milestones
          if (nextLevel > progress.level) {
            setLiquidProgressLabel(`Level ${nextLevel}!`);
            setLiquidProgressValue(100);
          } else {
            setLiquidProgressLabel(`${nextTotalTasks} Tasks!`);
            setLiquidProgressValue((nextTotalTasks % 10) * 10);
          }
          setShowLiquidProgress(true);
        }
      }
    }
  }, [pendingCompletions, updateTask, settings.enabled, settings.animations, progress]);

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
        <button className="btn" onClick={() => setShowSettings(true)}>
          ⚙ Settings
        </button>
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
            onTaskComplete={activeTab === 'active' ? handleTaskComplete : undefined}
            onMilestone={handleMilestone}
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

      <GracePeriodToast
        toasts={pendingCompletions}
        onUndo={handleUndo}
        onExpire={handleExpire}
      />

      <SettingsPage
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      <LiquidProgressAnimation
        progress={liquidProgressValue}
        show={showLiquidProgress}
        label={liquidProgressLabel}
        onComplete={() => setShowLiquidProgress(false)}
      />
    </div>
  );
};

export default App;