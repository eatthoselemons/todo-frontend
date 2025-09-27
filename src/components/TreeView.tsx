import React, { useEffect, useState } from "react";
import TreeNode from "./TreeNode";
import { Task, TaskID } from "../domain/Task";
import useTaskHooks from "../hooks/useTaskHooks";

interface TreeViewProps {
  rootTaskIds: TaskID[];
}

interface ExpandedState {
  [key: string]: boolean;
}

const TreeView: React.FC<TreeViewProps> = ({ rootTaskIds }) => {
  const [tasks, setTasks] = useState<Map<TaskID, Task>>(new Map());
  const [children, setChildren] = useState<Map<TaskID, TaskID[]>>(new Map());
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const { getTaskById, getImmediateChildren } = useTaskHooks();

  useEffect(() => {
    const loadTasks = async () => {
      const taskMap = new Map<TaskID, Task>();
      const childrenMap = new Map<TaskID, TaskID[]>();

      const loadTaskAndChildren = async (taskId: TaskID) => {
        const task = await getTaskById(taskId);
        if (task) {
          taskMap.set(taskId, task);
          const taskChildren = await getImmediateChildren(taskId);
          const childIds = taskChildren.map((t) => t.id);
          childrenMap.set(taskId, childIds);

          if (expanded[taskId]) {
            await Promise.all(childIds.map(loadTaskAndChildren));
          }
        }
      };

      await Promise.all(rootTaskIds.map(loadTaskAndChildren));
      setTasks(taskMap);
      setChildren(childrenMap);
    };

    loadTasks();
  }, [rootTaskIds, expanded]);

  const toggleExpand = (taskId: TaskID) => {
    setExpanded((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const renderTask = (taskId: TaskID, depth: number = 0): React.ReactNode => {
    const task = tasks.get(taskId);
    if (!task) return null;

    const taskChildren = children.get(taskId) || [];
    const hasChildren = taskChildren.length > 0;
    const isExpanded = expanded[taskId] || false;

    return (
      <React.Fragment key={taskId}>
        <TreeNode
          task={task}
          depth={depth}
          onToggle={() => toggleExpand(taskId)}
          isExpanded={isExpanded}
          hasChildren={hasChildren}
        />
        {isExpanded && taskChildren.map((childId) => renderTask(childId, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="tree">
      {rootTaskIds.map((taskId) => renderTask(taskId, 0))}
    </div>
  );
};

export default TreeView;