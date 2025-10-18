/**
 * Tree Calculations - Pure functions for task tree operations
 * Following Grokking Simplicity: Data transformations without side effects
 */

import { Task, TaskId } from "../domain";
import { isImmediateChildOf, getTaskDepth } from "./PathCalculations";

/**
 * TaskTree - Recursive tree structure
 */
export interface TaskTree {
  readonly task: Task;
  readonly children: ReadonlyArray<TaskTree>;
}

/**
 * Build task tree from flat list
 * Pure function - no mutations!
 */
export const buildTaskTree = (
  tasks: ReadonlyArray<Task>,
  rootId: TaskId
): TaskTree | undefined => {
  const rootTask = tasks.find((t) => t.id === rootId);
  if (!rootTask) return undefined;
  
  const children = tasks
    .filter((t) => isImmediateChildOf(t, rootId))
    .map((child) => buildTaskTree(tasks, child.id))
    .filter((tree): tree is TaskTree => tree !== undefined)
    .sort((a, b) => a.task.createdAt - b.task.createdAt);
  
  return {
    task: rootTask,
    children,
  };
};

/**
 * Build forest of trees (multiple root tasks)
 */
export const buildTaskForest = (
  tasks: ReadonlyArray<Task>,
  rootIds: ReadonlyArray<TaskId>
): ReadonlyArray<TaskTree> => {
  return rootIds
    .map((rootId) => buildTaskTree(tasks, rootId))
    .filter((tree): tree is TaskTree => tree !== undefined);
};

/**
 * Flatten tree to list (depth-first)
 */
export const flattenTree = (tree: TaskTree): ReadonlyArray<Task> => {
  const childTasks = tree.children.flatMap((child) => flattenTree(child));
  return [tree.task, ...childTasks];
};

/**
 * Flatten forest to list
 */
export const flattenForest = (
  forest: ReadonlyArray<TaskTree>
): ReadonlyArray<Task> => {
  return forest.flatMap((tree) => flattenTree(tree));
};

/**
 * Find task in tree
 */
export const findInTree = (
  tree: TaskTree,
  taskId: TaskId
): Task | undefined => {
  if (tree.task.id === taskId) return tree.task;
  
  for (const child of tree.children) {
    const found = findInTree(child, taskId);
    if (found) return found;
  }
  
  return undefined;
};

/**
 * Find task in forest
 */
export const findInForest = (
  forest: ReadonlyArray<TaskTree>,
  taskId: TaskId
): Task | undefined => {
  for (const tree of forest) {
    const found = findInTree(tree, taskId);
    if (found) return found;
  }
  return undefined;
};

/**
 * Update task in tree (immutable)
 * Returns new tree with updated task
 */
export const updateInTree = (
  tree: TaskTree,
  taskId: TaskId,
  updater: (task: Task) => Task
): TaskTree => {
  if (tree.task.id === taskId) {
    return {
      task: updater(tree.task),
      children: tree.children,
    };
  }
  
  return {
    task: tree.task,
    children: tree.children.map((child) =>
      updateInTree(child, taskId, updater)
    ),
  };
};

/**
 * Remove task from tree (immutable)
 * Returns new tree without the task and its subtree
 */
export const removeFromTree = (
  tree: TaskTree,
  taskId: TaskId
): TaskTree | undefined => {
  // If this is the task to remove, return undefined
  if (tree.task.id === taskId) return undefined;
  
  // Otherwise, filter children
  const newChildren = tree.children
    .map((child) => removeFromTree(child, taskId))
    .filter((tree): tree is TaskTree => tree !== undefined);
  
  return {
    task: tree.task,
    children: newChildren,
  };
};

/**
 * Get all leaf tasks (tasks with no children)
 */
export const getLeafTasks = (tree: TaskTree): ReadonlyArray<Task> => {
  if (tree.children.length === 0) {
    return [tree.task];
  }
  
  return tree.children.flatMap((child) => getLeafTasks(child));
};

/**
 * Get immediate children of a task
 */
export const getImmediateChildren = (
  tasks: ReadonlyArray<Task>,
  parentId: TaskId
): ReadonlyArray<Task> => {
  return tasks.filter((t) => isImmediateChildOf(t, parentId));
};

/**
 * Get all descendants of a task (not just immediate children)
 */
export const getAllDescendants = (
  tasks: ReadonlyArray<Task>,
  ancestorId: TaskId
): ReadonlyArray<Task> => {
  return tasks.filter((t) => 
    t.path.includes(ancestorId) && t.id !== ancestorId
  );
};

/**
 * Count total tasks in tree
 */
export const countTasksInTree = (tree: TaskTree): number => {
  return 1 + tree.children.reduce((sum, child) => 
    sum + countTasksInTree(child), 0
  );
};

/**
 * Get maximum depth of tree
 */
export const getTreeDepth = (tree: TaskTree): number => {
  if (tree.children.length === 0) return 0;
  
  const childDepths = tree.children.map((child) => getTreeDepth(child));
  return 1 + Math.max(...childDepths);
};

/**
 * Get tree breadth (max number of children at any level)
 */
export const getTreeBreadth = (tree: TaskTree): number => {
  const currentBreadth = tree.children.length;
  
  if (tree.children.length === 0) return 0;
  
  const childBreadths = tree.children.map((child) => getTreeBreadth(child));
  return Math.max(currentBreadth, ...childBreadths);
};

/**
 * Filter tree by predicate (keeps tree structure)
 */
export const filterTree = (
  tree: TaskTree,
  predicate: (task: Task) => boolean
): TaskTree | undefined => {
  const filteredChildren = tree.children
    .map((child) => filterTree(child, predicate))
    .filter((tree): tree is TaskTree => tree !== undefined);
  
  if (!predicate(tree.task) && filteredChildren.length === 0) {
    return undefined;
  }
  
  return {
    task: tree.task,
    children: filteredChildren,
  };
};

/**
 * Map over tree (transform each task)
 */
export const mapTree = (
  tree: TaskTree,
  mapper: (task: Task) => Task
): TaskTree => {
  return {
    task: mapper(tree.task),
    children: tree.children.map((child) => mapTree(child, mapper)),
  };
};

/**
 * Get path from root to task in tree
 */
export const getPathToTask = (
  tree: TaskTree,
  taskId: TaskId
): ReadonlyArray<Task> | undefined => {
  if (tree.task.id === taskId) {
    return [tree.task];
  }
  
  for (const child of tree.children) {
    const pathInChild = getPathToTask(child, taskId);
    if (pathInChild) {
      return [tree.task, ...pathInChild];
    }
  }
  
  return undefined;
};

/**
 * Sort tree children by comparator
 */
export const sortTree = (
  tree: TaskTree,
  comparator: (a: Task, b: Task) => number
): TaskTree => {
  const sortedChildren = [...tree.children]
    .sort((a, b) => comparator(a.task, b.task))
    .map((child) => sortTree(child, comparator));
  
  return {
    task: tree.task,
    children: sortedChildren,
  };
};

/**
 * Group tasks by depth level
 */
export const groupByLevel = (
  tasks: ReadonlyArray<Task>
): Map<number, ReadonlyArray<Task>> => {
  const grouped = new Map<number, Task[]>();
  
  for (const task of tasks) {
    const depth = getTaskDepth(task);
    const existing = grouped.get(depth) || [];
    grouped.set(depth, [...existing, task]);
  }
  
  return grouped;
};

/**
 * Get siblings of a task (tasks with same parent)
 */
export const getSiblings = (
  tasks: ReadonlyArray<Task>,
  task: Task
): ReadonlyArray<Task> => {
  if (task.path.length <= 1) return []; // Root tasks have no siblings
  
  const parentId = task.path[task.path.length - 2];
  return tasks.filter((t) => 
    isImmediateChildOf(t, parentId) && t.id !== task.id
  );
};
