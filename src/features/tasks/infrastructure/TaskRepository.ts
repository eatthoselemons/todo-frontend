/**
 * TaskRepository - Interface for task persistence
 * Following Repository pattern from DDD
 */

import { Effect, Context, Stream } from "effect";
import { Task, TaskId } from "../domain";
import { NotFoundError, DbError } from "./errors";

/**
 * Repository interface - abstracts database operations
 * Implementations can be PouchDB, IndexedDB, REST API, etc.
 */
export interface TaskRepository {
  /**
   * Get task by ID
   * Returns Effect that may fail with NotFoundError or DbError
   */
  readonly getById: (id: TaskId) => Effect.Effect<Task, NotFoundError | DbError>;

  /**
   * Get all tasks (excluding root)
   */
  readonly getAll: () => Effect.Effect<ReadonlyArray<Task>, DbError>;

  /**
   * Get immediate children of a parent task
   */
  readonly getImmediateChildren: (
    parentId: TaskId
  ) => Effect.Effect<ReadonlyArray<Task>, DbError>;

  /**
   * Get all root-level tasks
   */
  readonly getRootTasks: () => Effect.Effect<ReadonlyArray<Task>, DbError>;

  /**
   * Get all descendants (recursive children)
   */
  readonly getDescendants: (
    ancestorId: TaskId
  ) => Effect.Effect<ReadonlyArray<Task>, DbError>;

  /**
   * Save task (create or update)
   */
  readonly save: (task: Task) => Effect.Effect<void, DbError>;

  /**
   * Save multiple tasks (atomic transaction if possible)
   */
  readonly saveMany: (
    tasks: ReadonlyArray<Task>
  ) => Effect.Effect<void, DbError>;

  /**
   * Delete task by ID
   */
  readonly delete: (id: TaskId) => Effect.Effect<void, NotFoundError | DbError>;

  /**
   * Delete multiple tasks
   */
  readonly deleteMany: (
    ids: ReadonlyArray<TaskId>
  ) => Effect.Effect<void, DbError>;

  /**
   * Check if task exists
   */
  readonly exists: (id: TaskId) => Effect.Effect<boolean, DbError>;

  /**
   * Watch for changes to a specific task
   * Returns a Stream of task updates
   */
  readonly watch: (id: TaskId) => Stream.Stream<Task, DbError>;

  /**
   * Watch for all task changes
   */
  readonly watchAll: () => Stream.Stream<Task, DbError>;
}

/**
 * Service tag for dependency injection
 */
export const TaskRepository = Context.GenericTag<TaskRepository>(
  "@app/TaskRepository"
);
