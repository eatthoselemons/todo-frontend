/**
 * Task Calculations - Pure functions for individual task operations
 * Following Grokking Simplicity: Pure calculations with no side effects
 */

import { Task, TaskState, isCompleted as isStateCompleted, DueDate } from "../domain";

/**
 * Check if task is completed
 */
export const isTaskCompleted = (task: Task): boolean => {
  return isStateCompleted(task.state);
};

/**
 * Check if task is overdue
 * Takes current date as parameter (no Date.now() inside - keeps it pure!)
 */
export const isTaskOverdue = (task: Task, currentDate: DueDate): boolean => {
  if (!task.dueDate) return false;
  if (isTaskCompleted(task)) return false;
  return task.dueDate < currentDate;
};

/**
 * Check if task is due soon (within N days)
 */
export const isTaskDueSoon = (
  task: Task,
  currentDate: DueDate,
  daysThreshold: number
): boolean => {
  if (!task.dueDate) return false;
  if (isTaskCompleted(task)) return false;
  
  const dueDate = new Date(task.dueDate);
  const current = new Date(currentDate);
  const diffTime = dueDate.getTime() - current.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  return diffDays >= 0 && diffDays <= daysThreshold;
};

/**
 * Get days until due (negative if overdue)
 */
export const getDaysUntilDue = (
  task: Task,
  currentDate: DueDate
): number | undefined => {
  if (!task.dueDate) return undefined;
  
  const dueDate = new Date(task.dueDate);
  const current = new Date(currentDate);
  const diffTime = dueDate.getTime() - current.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

/**
 * Check if task has a due date set
 */
export const hasDueDate = (task: Task): boolean => {
  return task.dueDate !== undefined;
};

/**
 * Check if task was completed today
 */
export const wasCompletedToday = (task: Task, today: DueDate): boolean => {
  if (!isTaskCompleted(task)) return false;
  
  // Find the completion transition in history
  const completionTransition = task.history.find(
    (t) => t.newState._tag === "Done"
  );
  
  if (!completionTransition) return false;
  
  const completionDate = new Date(completionTransition.timestamp);
  const todayDate = new Date(today);
  
  return (
    completionDate.getFullYear() === todayDate.getFullYear() &&
    completionDate.getMonth() === todayDate.getMonth() &&
    completionDate.getDate() === todayDate.getDate()
  );
};

/**
 * Check if task was started today
 */
export const wasStartedToday = (task: Task, today: DueDate): boolean => {
  // Find the first InProgress transition
  const startTransition = task.history.find(
    (t) => t.newState._tag === "InProgress"
  );
  
  if (!startTransition) return false;
  
  const startDate = new Date(startTransition.timestamp);
  const todayDate = new Date(today);
  
  return (
    startDate.getFullYear() === todayDate.getFullYear() &&
    startDate.getMonth() === todayDate.getMonth() &&
    startDate.getDate() === todayDate.getDate()
  );
};

/**
 * Get task age in days
 */
export const getTaskAgeInDays = (task: Task, currentDate: DueDate): number => {
  const created = new Date(task.createdAt);
  const current = new Date(currentDate);
  const diffTime = current.getTime() - created.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

/**
 * Get time spent in current state (milliseconds)
 */
export const getTimeInCurrentState = (task: Task): number => {
  if (task.history.length === 0) return 0;
  
  const lastTransition = task.history[task.history.length - 1];
  return Date.now() - lastTransition.timestamp;
};

/**
 * Get total time task has been in a specific state
 */
export const getTotalTimeInState = (
  task: Task,
  state: TaskState["_tag"]
): number => {
  let totalTime = 0;
  let currentStateStart: number | null = null;
  
  for (let i = 0; i < task.history.length; i++) {
    const transition = task.history[i];
    
    // If entering the target state
    if (transition.newState._tag === state) {
      currentStateStart = transition.timestamp;
    }
    
    // If leaving the target state
    if (currentStateStart !== null && transition.newState._tag !== state) {
      totalTime += transition.timestamp - currentStateStart;
      currentStateStart = null;
    }
  }
  
  // If still in the target state
  if (currentStateStart !== null && task.state._tag === state) {
    totalTime += Date.now() - currentStateStart;
  }
  
  return totalTime;
};

/**
 * Count state transitions
 */
export const countStateTransitions = (task: Task): number => {
  return task.history.length;
};

/**
 * Check if task has been blocked
 */
export const hasBeenBlocked = (task: Task): boolean => {
  return task.history.some((t) => t.newState._tag === "Blocked");
};

/**
 * Get completion date (if completed)
 */
export const getCompletionDate = (task: Task): Date | undefined => {
  if (!isTaskCompleted(task)) return undefined;
  
  const completionTransition = task.history.find(
    (t) => t.newState._tag === "Done"
  );
  
  return completionTransition
    ? new Date(completionTransition.timestamp)
    : undefined;
};

/**
 * Compare tasks by due date (for sorting)
 * Returns: negative if a before b, positive if a after b, 0 if equal
 */
export const compareByDueDate = (a: Task, b: Task): number => {
  if (!a.dueDate && !b.dueDate) return 0;
  if (!a.dueDate) return 1; // Tasks without due dates go last
  if (!b.dueDate) return -1;
  return a.dueDate.localeCompare(b.dueDate);
};

/**
 * Compare tasks by creation date (for sorting)
 */
export const compareByCreationDate = (a: Task, b: Task): number => {
  return a.createdAt - b.createdAt;
};

/**
 * Compare tasks by completion date (for sorting)
 * Uncompleted tasks go last
 */
export const compareByCompletionDate = (a: Task, b: Task): number => {
  const aDate = getCompletionDate(a);
  const bDate = getCompletionDate(b);
  
  if (!aDate && !bDate) return 0;
  if (!aDate) return 1;
  if (!bDate) return -1;
  
  return aDate.getTime() - bDate.getTime();
};
