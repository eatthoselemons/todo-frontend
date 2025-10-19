/**
 * Task Query Service - Read operations
 * Uses Repository (database I/O) + Calculations (pure logic)
 */

import { Effect, Context, pipe } from "effect";
import { Task, TaskId, DueDate, ROOT_TASK_ID } from "../domain";
import { TaskRepository, TaskRepository as TaskRepositoryTag } from "../infrastructure/TaskRepository";
import { NotFoundError, DbError } from "../infrastructure/errors";
import {
  TaskTree,
  buildTaskTree,
  buildTaskForest,
} from "../calculations/TreeCalculations";
import {
  isTaskOverdue,
  compareByDueDate,
  compareByCreationDate,
} from "../calculations/TaskCalculations";

/**
 * Query Service Interface
 */
export interface TaskQueryService {
  /**
   * Get task by ID
   */
  readonly getTask: (
    id: TaskId
  ) => Effect.Effect<Task, NotFoundError | DbError>;

  /**
   * Get all tasks
   */
  readonly getAllTasks: () => Effect.Effect<ReadonlyArray<Task>, DbError>;

  /**
   * Get task tree starting from a root
   */
  readonly getTaskTree: (
    rootId: TaskId
  ) => Effect.Effect<TaskTree, NotFoundError | DbError>;

  /**
   * Get forest of root tasks
   */
  readonly getRootTaskForest: () => Effect.Effect<ReadonlyArray<TaskTree>, DbError>;

  /**
   * Get immediate children of a task
   */
  readonly getChildren: (
    parentId: TaskId
  ) => Effect.Effect<ReadonlyArray<Task>, DbError>;

  /**
   * Get all descendants (recursive)
   */
  readonly getDescendants: (
    ancestorId: TaskId
  ) => Effect.Effect<ReadonlyArray<Task>, DbError>;

  /**
   * Get overdue tasks
   */
  readonly getOverdueTasks: (
    currentDate: DueDate
  ) => Effect.Effect<ReadonlyArray<Task>, DbError>;

  /**
   * Get tasks by state
   */
  readonly getTasksByState: (
    state: "NotStarted" | "InProgress" | "Blocked" | "Done"
  ) => Effect.Effect<ReadonlyArray<Task>, DbError>;

  /**
   * Search tasks by text
   */
  readonly searchTasks: (
    query: string
  ) => Effect.Effect<ReadonlyArray<Task>, DbError>;
}

/**
 * Implementation
 */
export class TaskQueryServiceImpl implements TaskQueryService {
  constructor(private readonly repo: TaskRepository) {}

  getTask(id: TaskId): Effect.Effect<Task, NotFoundError | DbError> {
    return this.repo.getById(id);
  }

  getAllTasks(): Effect.Effect<ReadonlyArray<Task>, DbError> {
    return this.repo.getAll();
  }

  getTaskTree(
    rootId: TaskId
  ): Effect.Effect<TaskTree, NotFoundError | DbError> {
    return pipe(
      this.repo.getAll(),
      Effect.map((allTasks) => buildTaskTree(allTasks, rootId)),
      Effect.flatMap((tree) =>
        tree ? Effect.succeed(tree) : Effect.fail(NotFoundError.make(rootId))
      )
    );
  }

  getRootTaskForest(): Effect.Effect<ReadonlyArray<TaskTree>, DbError> {
    return pipe(
      Effect.all([this.repo.getRootTasks(), this.repo.getAll()]),
      Effect.map(([rootTasks, allTasks]) => {
        const rootIds = rootTasks.map((t) => t.id);
        return buildTaskForest(allTasks, rootIds);
      })
    );
  }

  getChildren(parentId: TaskId): Effect.Effect<ReadonlyArray<Task>, DbError> {
    return this.repo.getChildren(parentId);
  }

  getDescendants(
    ancestorId: TaskId
  ): Effect.Effect<ReadonlyArray<Task>, DbError> {
    return this.repo.getDescendants(ancestorId);
  }

  getOverdueTasks(
    currentDate: DueDate
  ): Effect.Effect<ReadonlyArray<Task>, DbError> {
    return pipe(
      this.repo.getAll(),
      Effect.map((allTasks) =>
        allTasks
          .filter((task) => isTaskOverdue(task, currentDate))
          .sort(compareByDueDate)
      )
    );
  }

  getTasksByState(
    state: "NotStarted" | "InProgress" | "Blocked" | "Done"
  ): Effect.Effect<ReadonlyArray<Task>, DbError> {
    return pipe(
      this.repo.getAll(),
      Effect.map((allTasks) =>
        allTasks
          .filter((task) => task.state._tag === state)
          .sort(compareByCreationDate)
      )
    );
  }

  searchTasks(query: string): Effect.Effect<ReadonlyArray<Task>, DbError> {
    return pipe(
      this.repo.getAll(),
      Effect.map((allTasks) => {
        const lowerQuery = query.toLowerCase();
        return allTasks.filter((task) =>
          task.text.toLowerCase().includes(lowerQuery)
        );
      })
    );
  }
}

/**
 * Service tag for dependency injection
 */
export const TaskQueryService = Context.GenericTag<TaskQueryService>(
  "@app/TaskQueryService"
);

/**
 * Live implementation factory
 */
export const TaskQueryServiceLive = pipe(
  TaskRepositoryTag,
  Effect.map((repo) => new TaskQueryServiceImpl(repo))
);
