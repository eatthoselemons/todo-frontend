/** @jsxImportSource @emotion/react */
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { css } from "@emotion/react";
import TreeNode from "./TreeNode";
import { Task, TaskID } from "../domain/Task";
import useTaskHooks from "../hooks/useTaskHooks";

interface TreeViewProps {
  rootTaskIds: TaskID[];
  expandAllTrigger?: number;
  collapseAllTrigger?: number;
  expandToLevelTrigger?: {level: number, trigger: number} | null;
  loadStrategy?: 'full' | 'lazy';
  onTaskComplete?: (task: Task) => void;
  onMilestone?: (label: string, value: number) => void;
}

interface ExpandedState {
  [key: string]: boolean;
}

// CSS for hiding collapsed children - keeps them in DOM for faster toggle
const childrenContainerStyle = (isExpanded: boolean) => css`
  display: ${isExpanded ? 'block' : 'none'};
`;

// For very large lists, we can use visibility instead of display
// This keeps layout but hides content, even faster for toggling
const childrenContainerOptimizedStyle = (isExpanded: boolean, depth: number) => css`
  visibility: ${isExpanded ? 'visible' : 'hidden'};
  height: ${isExpanded ? 'auto' : '0'};
  overflow: hidden;
  transition: ${depth < 3 ? 'height 0.2s ease-in-out' : 'none'};
`;

const TreeView: React.FC<TreeViewProps> = ({
  rootTaskIds,
  expandAllTrigger,
  collapseAllTrigger,
  expandToLevelTrigger,
  loadStrategy = 'lazy',
  onTaskComplete,
  onMilestone
}) => {
  const [tasks, setTasks] = useState<Map<TaskID, Task>>(new Map());
  const [children, setChildren] = useState<Map<TaskID, TaskID[]>>(new Map());
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [allTasksLoaded, setAllTasksLoaded] = useState(false);
  const { getTaskById, getImmediateChildren } = useTaskHooks();

  // Memoized toggle function with dynamic child loading for lazy mode
  const toggleExpand = useCallback(async (taskId: TaskID) => {
    const isCurrentlyExpanded = expanded[taskId];

    // Only load dynamically if using lazy strategy
    if (!isCurrentlyExpanded && loadStrategy === 'lazy') {
      const taskChildren = children.get(taskId);
      if (taskChildren && taskChildren.length > 0) {
        // Check if children are loaded
        const firstChildLoaded = tasks.has(taskChildren[0]);

        if (!firstChildLoaded) {
          // Load children dynamically
          const newTasks = new Map(tasks);
          const newChildren = new Map(children);

          for (const childId of taskChildren) {
            const childTask = await getTaskById(childId);
            if (childTask) {
              newTasks.set(childId, childTask);
              const grandChildren = await getImmediateChildren(childId);
              newChildren.set(childId, grandChildren.map(t => t.id));
            }
          }

          setTasks(newTasks);
          setChildren(newChildren);
        }
      }
    }

    setExpanded((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  }, [expanded, children, tasks, getTaskById, getImmediateChildren, loadStrategy]);

  useEffect(() => {
    if (expandAllTrigger && expandAllTrigger > 0) {
      const loadAllTasksRecursively = async () => {
        const taskMap = new Map<TaskID, Task>();
        const childrenMap = new Map<TaskID, TaskID[]>();
        const expandedMap: ExpandedState = {};

        const loadRecursive = async (taskId: TaskID) => {
          const task = await getTaskById(taskId);
          if (task) {
            taskMap.set(taskId, task);
            expandedMap[taskId] = true;
            const taskChildren = await getImmediateChildren(taskId);
            const childIds = taskChildren.map((t) => t.id);
            childrenMap.set(taskId, childIds);
            await Promise.all(childIds.map(loadRecursive));
          }
        };

        await Promise.all(rootTaskIds.map(loadRecursive));
        setTasks(taskMap);
        setChildren(childrenMap);
        setExpanded(expandedMap);
        setAllTasksLoaded(true);
      };

      loadAllTasksRecursively();
    }
  }, [expandAllTrigger, rootTaskIds, getTaskById, getImmediateChildren]);

  useEffect(() => {
    if (collapseAllTrigger && collapseAllTrigger > 0) {
      setExpanded({});
    }
  }, [collapseAllTrigger]);

  useEffect(() => {
    if (expandToLevelTrigger && expandToLevelTrigger.trigger > 0) {
      const loadAndExpandToLevel = async () => {
        const taskMap = new Map<TaskID, Task>();
        const childrenMap = new Map<TaskID, TaskID[]>();
        const newExpanded: ExpandedState = {};

        const loadRecursive = async (taskId: TaskID, currentLevel: number) => {
          const task = await getTaskById(taskId);
          if (task) {
            taskMap.set(taskId, task);
            const taskChildren = await getImmediateChildren(taskId);
            const childIds = taskChildren.map((t) => t.id);
            childrenMap.set(taskId, childIds);

            if (currentLevel < expandToLevelTrigger.level - 1) {
              newExpanded[taskId] = true;
              // Load one level deeper so expand buttons work
              await Promise.all(childIds.map(childId => loadRecursive(childId, currentLevel + 1)));
            } else if (currentLevel === expandToLevelTrigger.level - 1) {
              // Load immediate children at the target level so expand buttons work
              for (const childId of childIds) {
                const childTask = await getTaskById(childId);
                if (childTask) {
                  taskMap.set(childId, childTask);
                  const grandChildren = await getImmediateChildren(childId);
                  childrenMap.set(childId, grandChildren.map(t => t.id));
                }
              }
            }
          }
        };

        await Promise.all(rootTaskIds.map(taskId => loadRecursive(taskId, 0)));
        setTasks(taskMap);
        setChildren(childrenMap);
        setExpanded(newExpanded);
        // Don't set allTasksLoaded here - that should only be for "expand all"
        setAllTasksLoaded(false);
      };

      loadAndExpandToLevel();
    }
  }, [expandToLevelTrigger, rootTaskIds, getTaskById, getImmediateChildren]);

  useEffect(() => {
    const loadTasks = async () => {
      const taskMap = new Map<TaskID, Task>();
      const childrenMap = new Map<TaskID, TaskID[]>();
      const currentExpanded = expanded;

      const loadTaskAndChildren = async (taskId: TaskID, depth: number = 0) => {
        const task = await getTaskById(taskId);
        if (task) {
          taskMap.set(taskId, task);
          const taskChildren = await getImmediateChildren(taskId);
          const childIds = taskChildren.map((t) => t.id);
          childrenMap.set(taskId, childIds);

          if (loadStrategy === 'full') {
            // For 'full' strategy, load everything recursively
            await Promise.all(childIds.map(childId => loadTaskAndChildren(childId, depth + 1)));
          } else {
            // For 'lazy' strategy, load based on expansion state
            // Always load immediate children (depth 1) so expand buttons work
            if (depth === 0 || currentExpanded[taskId] || allTasksLoaded) {
              await Promise.all(childIds.map(childId => loadTaskAndChildren(childId, depth + 1)));
            }
          }
        }
      };

      await Promise.all(rootTaskIds.map(taskId => loadTaskAndChildren(taskId, 0)));
      setTasks(taskMap);
      setChildren(childrenMap);

      // If full load strategy, mark all tasks as loaded
      if (loadStrategy === 'full') {
        setAllTasksLoaded(true);
      }
    };

    loadTasks();
  }, [rootTaskIds, getTaskById, getImmediateChildren, loadStrategy]);

  // Memoize render function for better performance
  const renderTask = useCallback((taskId: TaskID, depth: number = 0): React.ReactNode => {
    const task = tasks.get(taskId);
    if (!task) return null;

    const taskChildren = children.get(taskId) || [];
    const hasChildren = taskChildren.length > 0;
    const isExpanded = expanded[taskId] || false;

    // Always render children container if there are children
    // This ensures expand/collapse works even if children aren't loaded yet
    const shouldRenderChildren = hasChildren;

    return (
      <React.Fragment key={taskId}>
        <TreeNode
          task={task}
          depth={depth}
          onToggle={() => toggleExpand(taskId)}
          isExpanded={isExpanded}
          hasChildren={hasChildren}
          onTaskComplete={onTaskComplete}
          onMilestone={onMilestone}
        />
        {shouldRenderChildren && (
          <div css={childrenContainerStyle(isExpanded)}>
            {taskChildren.map((childId) => renderTask(childId, depth + 1))}
          </div>
        )}
      </React.Fragment>
    );
  }, [tasks, children, expanded, toggleExpand, allTasksLoaded, onTaskComplete, onMilestone]);

  // Memoize the rendered tree
  const renderedTree = useMemo(() => (
    <div className="tree">
      {rootTaskIds.map((taskId) => renderTask(taskId, 0))}
    </div>
  ), [rootTaskIds, renderTask]);

  return renderedTree;
};

export default TreeView;