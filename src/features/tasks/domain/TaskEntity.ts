/**
 * Task Entity - Immutable domain model
 * Following DDD and Grokking Simplicity principles
 */

import { Effect, Schema } from "effect";
import { v4 as uuidv4 } from "uuid";
import {
  TaskId,
  TaskText,
  TaskPath,
  Timestamp,
  DueDate,
  makeTaskId,
  makeTaskText,
  makeTaskPath,
  makeTimestamp,
  makeDueDate,
  TaskIdSchema,
  TaskTextSchema,
  TaskPathSchema,
  TimestampSchema,
  DueDateSchema,
} from "./ValueObjects";
import {
  TaskState,
  NotStarted,
  TaskStateSchema,
  getNextState,
  canTransitionTo,
  toLegacyState,
  fromLegacyState,
} from "./TaskState";

/**
 * StateTransition - Record of state changes
 */
export interface StateTransition {
  readonly timestamp: Timestamp;
  readonly newState: TaskState;
}

export const StateTransitionSchema = Schema.Struct({
  timestamp: TimestampSchema,
  newState: TaskStateSchema,
});

/**
 * Task - Immutable entity
 * No setters, only methods that return new instances
 */
export interface Task {
  readonly id: TaskId;
  readonly text: TaskText;
  readonly state: TaskState;
  readonly path: TaskPath;
  readonly history: ReadonlyArray<StateTransition>;
  readonly dueDate?: DueDate;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

/**
 * Effect Schema for Task
 */
export const TaskSchema = Schema.Struct({
  id: TaskIdSchema,
  text: TaskTextSchema,
  state: TaskStateSchema,
  path: TaskPathSchema,
  history: Schema.Array(StateTransitionSchema),
  dueDate: Schema.optional(DueDateSchema),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

/**
 * Domain Errors
 */
export class InvalidTaskTextError {
  readonly _tag = "InvalidTaskTextError";
  constructor(readonly message: string) {}
}

export class InvalidStateTransitionError {
  readonly _tag = "InvalidStateTransitionError";
  constructor(
    readonly from: TaskState,
    readonly to: TaskState,
    readonly reason: string
  ) {}
}

/**
 * Smart Constructor - Create a new Task with validation
 * Returns Effect for proper error handling
 */
export const createTask = (params: {
  text: string;
  parentPath?: TaskPath;
  dueDate?: string;
  state?: TaskState;
}): Effect.Effect<Task, InvalidTaskTextError> => {
  return Effect.try({
    try: () => {
      const id = makeTaskId(uuidv4());
      const text = makeTaskText(params.text);
      const now = makeTimestamp();
      
      // Build path: parent path + this task's id
      const parentPath = params.parentPath ?? makeTaskPath([]);
      const path = makeTaskPath([...parentPath, id]);

      const state = params.state ?? NotStarted;
      const history: StateTransition[] = [
        { timestamp: now, newState: state },
      ];

      const task: Task = {
        id,
        text,
        state,
        path,
        history,
        dueDate: params.dueDate ? makeDueDate(params.dueDate) : undefined,
        createdAt: now,
        updatedAt: now,
      };

      return task;
    },
    catch: (error) =>
      new InvalidTaskTextError(
        error instanceof Error ? error.message : String(error)
      ),
  });
};

/**
 * Pure Calculations - Transform Task immutably
 */

export const updateText = (
  task: Task,
  newText: string
): Effect.Effect<Task, InvalidTaskTextError> => {
  return Effect.try({
    try: () => {
      const text = makeTaskText(newText);
      return {
        ...task,
        text,
        updatedAt: makeTimestamp(),
      };
    },
    catch: (error) =>
      new InvalidTaskTextError(
        error instanceof Error ? error.message : String(error)
      ),
  });
};

export const transitionState = (
  task: Task,
  newState: TaskState
): Effect.Effect<Task, InvalidStateTransitionError> => {
  if (!canTransitionTo(task.state, newState)) {
    return Effect.fail(
      new InvalidStateTransitionError(
        task.state,
        newState,
        `Cannot transition from ${task.state._tag} to ${newState._tag}`
      )
    );
  }

  const now = makeTimestamp();
  const transition: StateTransition = {
    timestamp: now,
    newState,
  };

  return Effect.succeed({
    ...task,
    state: newState,
    history: [...task.history, transition],
    updatedAt: now,
  });
};

export const progressToNextState = (
  task: Task
): Effect.Effect<Task, InvalidStateTransitionError> => {
  const nextState = getNextState(task.state);
  return transitionState(task, nextState);
};

export const completeTask = (
  task: Task
): Effect.Effect<Task, InvalidStateTransitionError> => {
  return transitionState(task, { _tag: "Done" });
};

export const setDueDate = (task: Task, dueDate?: string): Effect.Effect<Task, never> => {
  return Effect.succeed({
    ...task,
    dueDate: dueDate ? makeDueDate(dueDate) : undefined,
    updatedAt: makeTimestamp(),
  });
};

export const updatePath = (task: Task, newPath: TaskPath): Task => {
  return {
    ...task,
    path: newPath,
    updatedAt: makeTimestamp(),
  };
};

/**
 * Queries - Pure calculations about Task
 */

export const isOverdue = (task: Task, currentDate: string): boolean => {
  if (!task.dueDate) return false;
  if (task.state._tag === "Done") return false;
  return task.dueDate < currentDate;
};

export const getParentId = (task: Task): TaskId | undefined => {
  if (task.path.length <= 1) return undefined;
  return task.path[task.path.length - 2];
};

export const getDepth = (task: Task): number => {
  return task.path.length - 1;
};

export const isRoot = (task: Task): boolean => {
  return task.path.length === 1;
};

export const isDescendantOf = (task: Task, ancestorId: TaskId): boolean => {
  return task.path.includes(ancestorId);
};

/**
 * Serialization - Convert to/from legacy format
 */

export interface LegacyTask {
  _id: string;
  type: string;
  text: string;
  internalState: string;
  id: string;
  path: string[];
  changeLog: Array<{ time: number; newState: string }>;
  dueDate?: string;
}

export const toLegacy = (task: Task): LegacyTask => {
  return {
    _id: task.id,
    type: "task",
    text: task.text,
    internalState: toLegacyState(task.state),
    id: task.id,
    path: [...task.path],
    changeLog: task.history.map((t) => ({
      time: t.timestamp,
      newState: toLegacyState(t.newState),
    })),
    dueDate: task.dueDate,
  };
};

export const fromLegacy = (legacy: LegacyTask): Task => {
  // Convert path strings to TaskIds
  const pathIds = legacy.path.map(id => makeTaskId(id));
  
  return {
    id: makeTaskId(legacy.id),
    text: makeTaskText(legacy.text),
    state: fromLegacyState(legacy.internalState),
    path: makeTaskPath(pathIds),
    history: legacy.changeLog?.map((log) => ({
      timestamp: makeTimestamp(log.time),
      newState: fromLegacyState(log.newState),
    })) ?? [],
    dueDate: legacy.dueDate ? makeDueDate(legacy.dueDate) : undefined,
    createdAt: makeTimestamp(legacy.changeLog?.[0]?.time ?? Date.now()),
    updatedAt: makeTimestamp(Date.now()),
  };
};
