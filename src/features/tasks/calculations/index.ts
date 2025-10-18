/**
 * Calculations Layer - Pure Functions
 * Following Grokking Simplicity: Calculations vs Actions
 * 
 * All functions here are PURE:
 * - No side effects
 * - Same input always produces same output
 * - No mutations
 * - No I/O, no Date.now(), no random()
 */

// Path Calculations
export {
  getParentId,
  getParentIdFromPath,
  isRootTask,
  getTaskDepth,
  isDescendantOf,
  isPathDescendantOf,
  isImmediateChildOf,
  buildChildPath,
  getAncestorIds,
  getRelativePath,
  calculateMovedPath,
  calculateDescendantPathAfterMove,
  areSiblings,
  findCommonAncestor,
  getLevelDifference,
} from "./PathCalculations";

// Task Calculations
export {
  isTaskCompleted,
  isTaskOverdue,
  isTaskDueSoon,
  getDaysUntilDue,
  hasDueDate,
  wasCompletedToday,
  wasStartedToday,
  getTaskAgeInDays,
  getTimeInCurrentState,
  getTotalTimeInState,
  countStateTransitions,
  hasBeenBlocked,
  getCompletionDate,
  compareByDueDate,
  compareByCreationDate,
  compareByCompletionDate,
} from "./TaskCalculations";

// Tree Calculations
export {
  type TaskTree,
  buildTaskTree,
  buildTaskForest,
  flattenTree,
  flattenForest,
  findInTree,
  findInForest,
  updateInTree,
  removeFromTree,
  getLeafTasks,
  getImmediateChildren,
  getAllDescendants,
  countTasksInTree,
  getTreeDepth,
  getTreeBreadth,
  filterTree,
  mapTree,
  getPathToTask,
  sortTree,
  groupByLevel,
  getSiblings,
} from "./TreeCalculations";

// Progress Calculations
export {
  type ProgressStats,
  type BurndownPoint,
  calculateProgress,
  calculateTreeProgress,
  calculateChildrenProgress,
  groupByState,
  countByState,
  calculateVelocity,
  estimateCompletionDate,
  calculateBurndown,
  calculateWorkDistribution,
  calculateAverageCycleTime,
  calculateAverageLeadTime,
  formatDuration,
} from "./ProgressCalculations";
