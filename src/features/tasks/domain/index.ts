/**
 * Domain Layer - Public API
 * Export only what should be visible outside the domain
 */

// Value Objects (Schema-First)
export {
  // Types
  type TaskId,
  type TaskText,
  type TaskPath,
  type Timestamp,
  type DueDate,
  // Schema classes
  TaskIdSchema,
  TaskTextSchema,
  TaskPathSchema,
  TimestampSchema,
  DueDateSchema,
  // Constructors (validated)
  makeTaskId,
  makeTaskText,
  makeTaskPath,
  makeTimestamp,
  makeDueDate,
  // Helpers
  unsafeTaskId,
  ROOT_TASK_ID,
} from "./ValueObjects";

// Task State
export {
  type TaskState,
  NotStarted,
  InProgress,
  Blocked,
  Done,
  TaskStateSchema,
  getNextState,
  canTransitionTo,
  isCompleted,
  isBlocked,
  stateToString,
  fromLegacyState,
  toLegacyState,
} from "./TaskState";

// Task Entity
export {
  type Task,
  type StateTransition,
  type LegacyTask,
  TaskSchema,
  StateTransitionSchema,
  InvalidTaskTextError,
  InvalidStateTransitionError,
  createTask,
  updateText,
  transitionState,
  progressToNextState,
  completeTask,
  setDueDate,
  updatePath,
  isOverdue,
  getParentId,
  getDepth,
  isRoot,
  isDescendantOf,
  toLegacy,
  fromLegacy,
} from "./TaskEntity";

// Domain Events
export {
  type DomainEvent,
  type TaskCreated,
  type TaskTextUpdated,
  type TaskStateTransitioned,
  type TaskCompleted,
  type TaskMoved,
  type TaskDeleted,
  type TaskDueDateSet,
  type TaskDomainEvent,
  taskCreated,
  taskTextUpdated,
  taskStateTransitioned,
  taskCompleted,
  taskMoved,
  taskDeleted,
  taskDueDateSet,
  matchEvent,
} from "./DomainEvents";
