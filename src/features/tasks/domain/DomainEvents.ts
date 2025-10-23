/**
 * Domain Events - Record of things that happened
 * Following Event Sourcing and DDD principles
 */

import { Schema } from "effect";
import { TaskId, TaskText, TaskPath, Timestamp, makeTimestamp } from "./ValueObjects";
import { TaskState, TaskStateSchema } from "./TaskState";

/**
 * Base Event - Common properties for all domain events
 */
export interface DomainEvent {
  readonly eventId: string;
  readonly taskId: TaskId;
  readonly occurredAt: Timestamp;
}

/**
 * TaskCreated - A new task was created
 */
export interface TaskCreated extends DomainEvent {
  readonly _tag: "TaskCreated";
  readonly text: TaskText;
  readonly parentId?: TaskId;
  readonly path: TaskPath;
}

/**
 * TaskTextUpdated - Task text was changed
 */
export interface TaskTextUpdated extends DomainEvent {
  readonly _tag: "TaskTextUpdated";
  readonly oldText: TaskText;
  readonly newText: TaskText;
}

/**
 * TaskStateTransitioned - Task state changed
 */
export interface TaskStateTransitioned extends DomainEvent {
  readonly _tag: "TaskStateTransitioned";
  readonly fromState: TaskState;
  readonly toState: TaskState;
}

/**
 * TaskCompleted - Task marked as done
 */
export interface TaskCompleted extends DomainEvent {
  readonly _tag: "TaskCompleted";
  readonly completedAt: Timestamp;
  readonly isRoot: boolean;
}

/**
 * TaskMoved - Task moved in hierarchy
 */
export interface TaskMoved extends DomainEvent {
  readonly _tag: "TaskMoved";
  readonly oldPath: TaskPath;
  readonly newPath: TaskPath;
  readonly oldParentId?: TaskId;
  readonly newParentId?: TaskId;
}

/**
 * TaskDeleted - Task was deleted
 */
export interface TaskDeleted extends DomainEvent {
  readonly _tag: "TaskDeleted";
  readonly deletedWith: TaskId[]; // IDs of descendants also deleted
}

/**
 * TaskDueDateSet - Due date was set or changed
 */
export interface TaskDueDateSet extends DomainEvent {
  readonly _tag: "TaskDueDateSet";
  readonly dueDate?: string;
}

/**
 * Union of all domain events
 */
export type TaskDomainEvent =
  | TaskCreated
  | TaskTextUpdated
  | TaskStateTransitioned
  | TaskCompleted
  | TaskMoved
  | TaskDeleted
  | TaskDueDateSet;

/**
 * Event Constructors - Smart constructors for creating events
 */

export const taskCreated = (params: {
  taskId: TaskId;
  text: TaskText;
  parentId?: TaskId;
  path: TaskPath;
}): TaskCreated => ({
  _tag: "TaskCreated",
  eventId: crypto.randomUUID(),
  taskId: params.taskId,
  text: params.text,
  parentId: params.parentId,
  path: params.path,
  occurredAt: makeTimestamp(),
});

export const taskTextUpdated = (params: {
  taskId: TaskId;
  oldText: TaskText;
  newText: TaskText;
}): TaskTextUpdated => ({
  _tag: "TaskTextUpdated",
  eventId: crypto.randomUUID(),
  taskId: params.taskId,
  oldText: params.oldText,
  newText: params.newText,
  occurredAt: makeTimestamp(),
});

export const taskStateTransitioned = (params: {
  taskId: TaskId;
  fromState: TaskState;
  toState: TaskState;
}): TaskStateTransitioned => ({
  _tag: "TaskStateTransitioned",
  eventId: crypto.randomUUID(),
  taskId: params.taskId,
  fromState: params.fromState,
  toState: params.toState,
  occurredAt: makeTimestamp(),
});

export const taskCompleted = (params: {
  taskId: TaskId;
  isRoot: boolean;
}): TaskCompleted => ({
  _tag: "TaskCompleted",
  eventId: crypto.randomUUID(),
  taskId: params.taskId,
  completedAt: makeTimestamp(),
  isRoot: params.isRoot,
  occurredAt: makeTimestamp(),
});

export const taskMoved = (params: {
  taskId: TaskId;
  oldPath: TaskPath;
  newPath: TaskPath;
  oldParentId?: TaskId;
  newParentId?: TaskId;
}): TaskMoved => ({
  _tag: "TaskMoved",
  eventId: crypto.randomUUID(),
  taskId: params.taskId,
  oldPath: params.oldPath,
  newPath: params.newPath,
  oldParentId: params.oldParentId,
  newParentId: params.newParentId,
  occurredAt: makeTimestamp(),
});

export const taskDeleted = (params: {
  taskId: TaskId;
  deletedWith: TaskId[];
}): TaskDeleted => ({
  _tag: "TaskDeleted",
  eventId: crypto.randomUUID(),
  taskId: params.taskId,
  deletedWith: params.deletedWith,
  occurredAt: makeTimestamp(),
});

export const taskDueDateSet = (params: {
  taskId: TaskId;
  dueDate?: string;
}): TaskDueDateSet => ({
  _tag: "TaskDueDateSet",
  eventId: crypto.randomUUID(),
  taskId: params.taskId,
  dueDate: params.dueDate,
  occurredAt: makeTimestamp(),
});

/**
 * Event pattern matching helper
 */
export const matchEvent = <R>(event: TaskDomainEvent) => ({
  TaskCreated: (f: (e: TaskCreated) => R): R | undefined =>
    event._tag === "TaskCreated" ? f(event) : undefined,
  TaskTextUpdated: (f: (e: TaskTextUpdated) => R): R | undefined =>
    event._tag === "TaskTextUpdated" ? f(event) : undefined,
  TaskStateTransitioned: (f: (e: TaskStateTransitioned) => R): R | undefined =>
    event._tag === "TaskStateTransitioned" ? f(event) : undefined,
  TaskCompleted: (f: (e: TaskCompleted) => R): R | undefined =>
    event._tag === "TaskCompleted" ? f(event) : undefined,
  TaskMoved: (f: (e: TaskMoved) => R): R | undefined =>
    event._tag === "TaskMoved" ? f(event) : undefined,
  TaskDeleted: (f: (e: TaskDeleted) => R): R | undefined =>
    event._tag === "TaskDeleted" ? f(event) : undefined,
  TaskDueDateSet: (f: (e: TaskDueDateSet) => R): R | undefined =>
    event._tag === "TaskDueDateSet" ? f(event) : undefined,
});
