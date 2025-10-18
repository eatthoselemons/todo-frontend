/**
 * Progress Calculations - Pure functions for progress tracking
 * Following Grokking Simplicity: Pure data transformations
 */

import { Task, TaskState, isCompleted } from "../domain";
import { TaskTree, flattenTree } from "./TreeCalculations";
import { isTaskCompleted } from "./TaskCalculations";

/**
 * Progress statistics for a set of tasks
 */
export interface ProgressStats {
  readonly total: number;
  readonly completed: number;
  readonly inProgress: number;
  readonly notStarted: number;
  readonly blocked: number;
  readonly completionPercentage: number;
}

/**
 * Calculate progress statistics for a list of tasks
 */
export const calculateProgress = (
  tasks: ReadonlyArray<Task>
): ProgressStats => {
  const total = tasks.length;
  
  if (total === 0) {
    return {
      total: 0,
      completed: 0,
      inProgress: 0,
      notStarted: 0,
      blocked: 0,
      completionPercentage: 0,
    };
  }
  
  const completed = tasks.filter((t) => t.state._tag === "Done").length;
  const inProgress = tasks.filter((t) => t.state._tag === "InProgress").length;
  const notStarted = tasks.filter((t) => t.state._tag === "NotStarted").length;
  const blocked = tasks.filter((t) => t.state._tag === "Blocked").length;
  
  return {
    total,
    completed,
    inProgress,
    notStarted,
    blocked,
    completionPercentage: (completed / total) * 100,
  };
};

/**
 * Calculate progress for a tree (including all descendants)
 */
export const calculateTreeProgress = (tree: TaskTree): ProgressStats => {
  const allTasks = flattenTree(tree);
  return calculateProgress(allTasks);
};

/**
 * Calculate progress for direct children only (not recursive)
 */
export const calculateChildrenProgress = (tree: TaskTree): ProgressStats => {
  const childTasks = tree.children.map((c) => c.task);
  return calculateProgress(childTasks);
};

/**
 * Group tasks by state
 */
export const groupByState = (
  tasks: ReadonlyArray<Task>
): Record<TaskState["_tag"], ReadonlyArray<Task>> => {
  return {
    NotStarted: tasks.filter((t) => t.state._tag === "NotStarted"),
    InProgress: tasks.filter((t) => t.state._tag === "InProgress"),
    Blocked: tasks.filter((t) => t.state._tag === "Blocked"),
    Done: tasks.filter((t) => t.state._tag === "Done"),
  };
};

/**
 * Count tasks by state
 */
export const countByState = (
  tasks: ReadonlyArray<Task>
): Record<TaskState["_tag"], number> => {
  const grouped = groupByState(tasks);
  return {
    NotStarted: grouped.NotStarted.length,
    InProgress: grouped.InProgress.length,
    Blocked: grouped.Blocked.length,
    Done: grouped.Done.length,
  };
};

/**
 * Calculate velocity (tasks completed per day)
 * Takes date range and completed tasks
 */
export const calculateVelocity = (
  completedTasks: ReadonlyArray<Task>,
  startDate: Date,
  endDate: Date
): number => {
  const daysInPeriod = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysInPeriod <= 0) return 0;
  
  return completedTasks.length / daysInPeriod;
};

/**
 * Estimate completion date based on velocity
 */
export const estimateCompletionDate = (
  remainingTasks: number,
  velocity: number
): Date | undefined => {
  if (velocity <= 0) return undefined;
  
  const daysToComplete = remainingTasks / velocity;
  const estimatedDate = new Date();
  estimatedDate.setDate(estimatedDate.getDate() + Math.ceil(daysToComplete));
  
  return estimatedDate;
};

/**
 * Calculate burndown data (remaining tasks over time)
 */
export interface BurndownPoint {
  readonly date: Date;
  readonly remaining: number;
  readonly completed: number;
}

export const calculateBurndown = (
  allTasks: ReadonlyArray<Task>,
  startDate: Date,
  endDate: Date
): ReadonlyArray<BurndownPoint> => {
  const points: BurndownPoint[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split("T")[0];
    
    const completedByDate = allTasks.filter((t) => {
      if (!isTaskCompleted(t)) return false;
      
      const completionTransition = t.history.find(
        (h) => h.newState._tag === "Done"
      );
      
      if (!completionTransition) return false;
      
      const completionDate = new Date(completionTransition.timestamp)
        .toISOString()
        .split("T")[0];
      
      return completionDate <= dateStr;
    }).length;
    
    points.push({
      date: new Date(currentDate),
      remaining: allTasks.length - completedByDate,
      completed: completedByDate,
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return points;
};

/**
 * Calculate work distribution (who's doing what)
 * If tasks had an assignee field, this would group by assignee
 * For now, just count by state
 */
export const calculateWorkDistribution = (
  tasks: ReadonlyArray<Task>
): {
  readonly activeWork: number; // InProgress + Blocked
  readonly pendingWork: number; // NotStarted
  readonly completedWork: number; // Done
} => {
  const byState = countByState(tasks);
  
  return {
    activeWork: byState.InProgress + byState.Blocked,
    pendingWork: byState.NotStarted,
    completedWork: byState.Done,
  };
};

/**
 * Calculate cycle time (average time from start to completion)
 * Returns average milliseconds
 */
export const calculateAverageCycleTime = (
  completedTasks: ReadonlyArray<Task>
): number => {
  if (completedTasks.length === 0) return 0;
  
  const cycleTimes = completedTasks
    .map((task) => {
      const startTransition = task.history.find(
        (h) => h.newState._tag === "InProgress"
      );
      const endTransition = task.history.find(
        (h) => h.newState._tag === "Done"
      );
      
      if (!startTransition || !endTransition) return null;
      
      return endTransition.timestamp - startTransition.timestamp;
    })
    .filter((time): time is number => time !== null);
  
  if (cycleTimes.length === 0) return 0;
  
  const sum = cycleTimes.reduce((a, b) => a + b, 0);
  return sum / cycleTimes.length;
};

/**
 * Calculate lead time (average time from creation to completion)
 */
export const calculateAverageLeadTime = (
  completedTasks: ReadonlyArray<Task>
): number => {
  if (completedTasks.length === 0) return 0;
  
  const leadTimes = completedTasks
    .map((task) => {
      const endTransition = task.history.find(
        (h) => h.newState._tag === "Done"
      );
      
      if (!endTransition) return null;
      
      return endTransition.timestamp - task.createdAt;
    })
    .filter((time): time is number => time !== null);
  
  if (leadTimes.length === 0) return 0;
  
  const sum = leadTimes.reduce((a, b) => a + b, 0);
  return sum / leadTimes.length;
};

/**
 * Format milliseconds to human-readable duration
 */
export const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
};
