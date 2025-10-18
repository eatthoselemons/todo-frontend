/**
 * Path Calculations - Pure functions for task path operations
 * Following Grokking Simplicity: Calculations (pure functions) vs Actions (side effects)
 */

import { Task, TaskId, TaskPath, makeTaskPath } from "../domain";

/**
 * Get parent ID from task
 * Returns undefined if task is at root level
 */
export const getParentId = (task: Task): TaskId | undefined => {
  if (task.path.length <= 1) return undefined;
  return task.path[task.path.length - 2];
};

/**
 * Get parent ID from path directly
 */
export const getParentIdFromPath = (path: TaskPath): TaskId | undefined => {
  if (path.length <= 1) return undefined;
  return path[path.length - 2];
};

/**
 * Check if task is a root-level task
 */
export const isRootTask = (task: Task): boolean => {
  return task.path.length === 1;
};

/**
 * Get depth of task in hierarchy (0 = root level)
 */
export const getTaskDepth = (task: Task): number => {
  return task.path.length - 1;
};

/**
 * Check if task is a descendant of another task
 */
export const isDescendantOf = (task: Task, ancestorId: TaskId): boolean => {
  return task.path.includes(ancestorId);
};

/**
 * Check if one path is descendant of another
 */
export const isPathDescendantOf = (
  path: TaskPath,
  ancestorId: TaskId
): boolean => {
  return path.includes(ancestorId);
};

/**
 * Check if task is an immediate child of another task
 */
export const isImmediateChildOf = (task: Task, parentId: TaskId): boolean => {
  const taskParentId = getParentId(task);
  return taskParentId === parentId;
};

/**
 * Build new path by appending task ID to parent path
 */
export const buildChildPath = (
  parentPath: TaskPath,
  childId: TaskId
): TaskPath => {
  return makeTaskPath([...parentPath, childId]);
};

/**
 * Get all ancestor IDs from path (excluding the task itself)
 */
export const getAncestorIds = (task: Task): ReadonlyArray<TaskId> => {
  return task.path.slice(0, -1);
};

/**
 * Get relative path between two tasks
 * Returns the path from ancestor to descendant
 */
export const getRelativePath = (
  from: TaskPath,
  to: TaskPath
): ReadonlyArray<TaskId> => {
  // Find common prefix
  let commonLength = 0;
  const minLength = Math.min(from.length, to.length);
  
  for (let i = 0; i < minLength; i++) {
    if (from[i] === to[i]) {
      commonLength = i + 1;
    } else {
      break;
    }
  }
  
  // Return the part of 'to' path after common prefix
  return to.slice(commonLength);
};

/**
 * Calculate new path after moving task to new parent
 */
export const calculateMovedPath = (
  taskId: TaskId,
  newParentPath: TaskPath
): TaskPath => {
  return buildChildPath(newParentPath, taskId);
};

/**
 * Update descendant paths after ancestor move
 * Returns new path for descendant based on ancestor's new path
 */
export const calculateDescendantPathAfterMove = (
  descendantPath: TaskPath,
  ancestorOldPath: TaskPath,
  ancestorNewPath: TaskPath
): TaskPath => {
  // Get the relative path from ancestor to descendant
  const relativePath = descendantPath.slice(ancestorOldPath.length);
  
  // Append relative path to ancestor's new path
  return makeTaskPath([...ancestorNewPath, ...relativePath]);
};

/**
 * Check if two paths represent sibling tasks
 */
export const areSiblings = (path1: TaskPath, path2: TaskPath): boolean => {
  if (path1.length !== path2.length) return false;
  if (path1.length <= 1) return false; // Root tasks are not siblings
  
  // Check if they have the same parent
  const parent1 = getParentIdFromPath(path1);
  const parent2 = getParentIdFromPath(path2);
  
  return parent1 === parent2;
};

/**
 * Find common ancestor between two tasks
 * Returns the deepest common ancestor ID
 */
export const findCommonAncestor = (
  path1: TaskPath,
  path2: TaskPath
): TaskId | undefined => {
  const minLength = Math.min(path1.length, path2.length);
  
  for (let i = minLength - 1; i >= 0; i--) {
    if (path1[i] === path2[i]) {
      return path1[i];
    }
  }
  
  return undefined;
};

/**
 * Get level difference between two tasks
 * Positive = task1 is deeper, Negative = task2 is deeper
 */
export const getLevelDifference = (task1: Task, task2: Task): number => {
  return getTaskDepth(task1) - getTaskDepth(task2);
};
