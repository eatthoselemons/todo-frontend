import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Task, TaskId, TaskState, ROOT_TASK_ID } from "./features/tasks/domain";
import { useTaskQueries, useTaskCommands } from "./features/tasks/hooks";
import { useTaskContext } from "./features/tasks/context/TaskContext";
import TreeView from "./components/tasks/TreeView";
import TodayUpcoming from "./components/tasks/TodayUpcoming";
import CompletedToday from "./components/tasks/CompletedToday";
import History from "./components/tasks/History";
import DensityMenu from "./components/shared/DensityMenu";
import { AddTaskModal } from "./components/tasks/AddTaskModal";
import { GracePeriodToast } from "./features/rewards/components/GracePeriodToast";
import { SettingsPage } from "./features/settings/components/SettingsPage";
import { LiquidProgressAnimation } from "./features/rewards/themes/liquid/components/LiquidProgressAnimation";
import { useRewardsContext } from "./features/rewards/context/RewardsContext";
import ThemeEffectsHost from "./features/rewards/components/ThemeEffectsHost";
import AdvancedThreeEffectsHost from "./features/rewards/components/AdvancedThreeEffectsHost";
import "./styles/app.css";

const App: React.FC = () => {
  const [taskIds, setTaskIds] = useState<TaskId[]>([]);
  const [doneTaskIds, setDoneTaskIds] = useState<TaskId[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'done'>('active');
  const [filterText, setFilterText] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [expandAllTrigger, setExpandAllTrigger] = useState(0);
  const [collapseAllTrigger, setCollapseAllTrigger] = useState(0);
  const [expandToLevelTrigger, setExpandToLevelTrigger] = useState<{level: number, trigger: number} | null>(null);
  const [stateOverrides, setStateOverrides] = useState<Map<TaskId, TaskState>>(new Map());
  const [pendingCompletions, setPendingCompletions] = useState<Array<{id: string; taskId: TaskId; from: TaskState; message: string}>>([]);
  const [showLiquidProgress, setShowLiquidProgress] = useState(false);
  const [liquidProgressValue, setLiquidProgressValue] = useState(0);
  const [liquidProgressLabel, setLiquidProgressLabel] = useState("");
  const { getRootTaskIds, getTask } = useTaskQueries();
  const { completeTask } = useTaskCommands();
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

  // Helper to get effective state with overrides
  const getEffectiveState = useCallback((taskId: TaskId, task: Task): TaskState => {
    return stateOverrides.get(taskId) ?? task.state;
  }, [stateOverrides]);

  // Handle milestone animation
  const handleMilestone = useCallback((label: string, value: number) => {
    if (settings.enabled && settings.animations && settings.progression) {
      setLiquidProgressLabel(label);
      setLiquidProgressValue(value);
      setShowLiquidProgress(true);
    }
  }, [settings.enabled, settings.animations, settings.progression]);

  // Handle task completion with grace period (optimistic)
  const handleTaskComplete = useCallback((task: Task) => {
    const toastId = `toast-${Date.now()}-${task.id}`;
    const doneState: TaskState = { _tag: "Done" };
    
    // Add optimistic override (no DB write)
    setStateOverrides(prev => new Map(prev).set(task.id, doneState));
    
    // Track pending completion
    setPendingCompletions(prev => [...prev, {
      id: toastId,
      taskId: task.id,
      from: task.state,
      message: `"${task.text}" moving to Done`
    }]);
  }, []);

  // Handle undo from grace period (remove override, no DB write)
  const handleUndo = useCallback((taskId: TaskId) => {
    // Remove state override to restore original state
    setStateOverrides(prev => {
      const newMap = new Map(prev);
      newMap.delete(taskId);
      return newMap;
    });

    // Remove from pending
    setPendingCompletions(prev => prev.filter(p => p.taskId !== taskId));
  }, []);

  // Handle grace period expiry (commit to DB)
  const handleExpire = useCallback(async (taskId: TaskId) => {
    const pending = pendingCompletions.find(p => p.taskId === taskId);
    if (pending) {
      // Call completeTask service to write to DB
      await completeTask(taskId);
      
      // Clear pending and override
      setPendingCompletions(prev => prev.filter(p => p.taskId !== taskId));
      setStateOverrides(prev => {
        const newMap = new Map(prev);
        newMap.delete(taskId);
        return newMap;
      });

      // Check for milestone progress (every 5 tasks or at level boundaries)
      if (settings.enabled && settings.animations && settings.progression) {
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
  }, [pendingCompletions, completeTask, settings.enabled, settings.animations, settings.progression, progress]);

  useEffect(() => {
    const loadAndSeparateTasks = async () => {
      const allTaskIds = await getRootTaskIds();
      const activeTasks: TaskId[] = [];
      const doneTasks: TaskId[] = [];

      for (const taskId of allTaskIds) {
        const task = await getTask(taskId);
        if (task) {
          const effectiveState = getEffectiveState(taskId, task);
          if (effectiveState._tag === "Done") {
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
  }, [getRootTaskIds, getTask, getEffectiveState]);

  useEffect(() => {
    const changes = db
      .changes({
        since: "now",
        live: true,
      })
      .on("change", async () => {
        const allTaskIds = await getRootTaskIds();
        const activeTasks: TaskId[] = [];
        const doneTasks: TaskId[] = [];

        for (const taskId of allTaskIds) {
          const task = await getTask(taskId);
          if (task) {
            const effectiveState = getEffectiveState(taskId, task);
            if (effectiveState._tag === "Done") {
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
  }, [db, getRootTaskIds, getTask, getEffectiveState]);

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
            onTaskComplete={activeTab === 'active' ? (handleTaskComplete as any) : undefined}
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
        parentTaskId={ROOT_TASK_ID}
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

      {settings.enabled && settings.animations && settings.intensity === 'minimal' && (
        <ThemeEffectsHost />
      )}

      {settings.enabled && settings.animations && (settings.intensity === 'standard' || settings.intensity === 'extra') && (
        <AdvancedThreeEffectsHost />
      )}
    </div>
  );
};

export default App;
