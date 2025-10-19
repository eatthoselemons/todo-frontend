/**
 * Task Command Service - Write operations
 * Uses Repository (database I/O) + Domain logic
 */

import { Effect, Context, pipe } from "effect";
import {
  Task,
  TaskId,
  TaskPath,
  createTask,
  updateText,
  transitionState,
  completeTask,
  setDueDate,
  updatePath,
  TaskState,
  InvalidTaskTextError,
  InvalidStateTransitionError,
  ROOT_TASK_ID,
  makeTaskPath,
} from "../domain";
import { TaskRepository, TaskRepository as TaskRepositoryTag } from "../infrastructure/TaskRepository";
import { NotFoundError, DbError, ConstraintViolationError } from "../infrastructure/errors";
import {
  buildChildPath,
  calculateDescendantPathAfterMove,
} from "../calculations/PathCalculations";
import { getAllDescendants } from "../calculations/TreeCalculations";

/**
 * Command Service Interface
 */
export interface TaskCommandService {
  /**
   * Create a new task
   */
  readonly createTask: (params: {
    text: string;
    parentId?: TaskId;
    dueDate?: string;
  }) => Effect.Effect<Task, InvalidTaskTextError | DbError>;

  /**
   * Update task text
   */
  readonly updateTaskText: (
    taskId: TaskId,
    newText: string
  ) => Effect.Effect<Task, NotFoundError | InvalidTaskTextError | DbError>;

  /**
   * Transition task to new state
   */
  readonly transitionTaskState: (
    taskId: TaskId,
    newState: TaskState
  ) => Effect.Effect<Task, NotFoundError | InvalidStateTransitionError | DbError>;

  /**
   * Complete a task
   */
  readonly completeTask: (
    taskId: TaskId
  ) => Effect.Effect<Task, NotFoundError | InvalidStateTransitionError | DbError>;

  /**
   * Set task due date
   */
  readonly setTaskDueDate: (
    taskId: TaskId,
    dueDate?: string
  ) => Effect.Effect<Task, NotFoundError | DbError>;

  /**
   * Move task to new parent
   */
  readonly moveTask: (
    taskId: TaskId,
    newParentId: TaskId
  ) => Effect.Effect<void, NotFoundError | ConstraintViolationError | DbError>;

  /**
   * Delete task and all descendants
   */
  readonly deleteTask: (
    taskId: TaskId
  ) => Effect.Effect<void, NotFoundError | ConstraintViolationError | DbError>;

  /**
   * Clear all subtasks (delete children but keep task)
   */
  readonly clearSubtasks: (
    taskId: TaskId
  ) => Effect.Effect<void, NotFoundError | DbError>;
}

/**
 * Implementation
 */
export class TaskCommandServiceImpl implements TaskCommandService {
  constructor(private readonly repo: TaskRepository) {}

  createTask(params: {
    text: string;
    parentId?: TaskId;
    dueDate?: string;
  }): Effect.Effect<Task, InvalidTaskTextError | DbError> {
    const parentId = params.parentId ?? ROOT_TASK_ID;
    
    return pipe(
      this.repo.getById(parentId),
      Effect.catchTag("NotFoundError", () => 
        Effect.fail(new InvalidTaskTextError(`Parent task not found: ${parentId}`))
      ),
      Effect.flatMap((parent) =>
        createTask({
          text: params.text,
          parentPath: parent.path,
          dueDate: params.dueDate,
        })
      ),
      Effect.tap((task) => this.repo.save(task))
    );
  }

  updateTaskText(
    taskId: TaskId,
    newText: string
  ): Effect.Effect<Task, NotFoundError | InvalidTaskTextError | DbError> {
    return pipe(
      this.repo.getById(taskId),
      Effect.flatMap((task) => updateText(task, newText)),
      Effect.tap((updated) => this.repo.save(updated))
    );
  }

  transitionTaskState(
    taskId: TaskId,
    newState: TaskState
  ): Effect.Effect<Task, NotFoundError | InvalidStateTransitionError | DbError> {
    return pipe(
      this.repo.getById(taskId),
      Effect.flatMap((task) => transitionState(task, newState)),
      Effect.tap((updated) => this.repo.save(updated))
    );
  }

  completeTask(
    taskId: TaskId
  ): Effect.Effect<Task, NotFoundError | InvalidStateTransitionError | DbError> {
    return pipe(
      this.repo.getById(taskId),
      Effect.flatMap((task) => completeTask(task)),
      Effect.tap((updated) => this.repo.save(updated))
    );
  }

  setTaskDueDate(
    taskId: TaskId,
    dueDate?: string
  ): Effect.Effect<Task, NotFoundError | DbError> {
    return pipe(
      this.repo.getById(taskId),
      Effect.flatMap((task) => setDueDate(task, dueDate)),
      Effect.tap((updated) => this.repo.save(updated))
    );
  }

  moveTask(
    taskId: TaskId,
    newParentId: TaskId
  ): Effect.Effect<void, NotFoundError | ConstraintViolationError | DbError> {
    if (taskId === ROOT_TASK_ID) {
      return Effect.fail(
        ConstraintViolationError.make(
          "cannot-move-root",
          "Cannot move root task"
        )
      );
    }

    return pipe(
      Effect.all({
        task: this.repo.getById(taskId),
        newParent: this.repo.getById(newParentId),
        allTasks: this.repo.getAll()
      }),
      Effect.flatMap(({ task, newParent, allTasks }): Effect.Effect<void, ConstraintViolationError | DbError> => {
        if (newParent.path.includes(taskId)) {
          return Effect.fail(
            ConstraintViolationError.make(
              "circular-reference",
              "Cannot move task into its own descendants"
            )
          );
        }

        const oldPath = task.path;
        const newPath = buildChildPath(newParent.path, taskId);
        const updatedTask = updatePath(task, newPath);

        const descendants = getAllDescendants(allTasks, taskId);
        const updatedDescendants = descendants.map((descendant) => {
          const newDescendantPath = calculateDescendantPathAfterMove(
            descendant.path,
            oldPath,
            newPath
          );
          return updatePath(descendant, newDescendantPath);
        });

        return this.repo.saveMany([updatedTask, ...updatedDescendants]);
      })
    );
  }

  deleteTask(
    taskId: TaskId
  ): Effect.Effect<void, NotFoundError | ConstraintViolationError | DbError> {
    if (taskId === ROOT_TASK_ID) {
      return Effect.fail(
        ConstraintViolationError.make(
          "cannot-delete-root",
          "Cannot delete root task"
        )
      );
    }

    return pipe(
      this.repo.getAll(),
      Effect.flatMap((allTasks) => {
        const descendants = getAllDescendants(allTasks, taskId);
        const idsToDelete = [taskId, ...descendants.map((d) => d.id)];
        return this.repo.deleteMany(idsToDelete);
      })
    );
  }

  clearSubtasks(
    taskId: TaskId
  ): Effect.Effect<void, NotFoundError | DbError> {
    return pipe(
      this.repo.getChildren(taskId),
      Effect.flatMap((children) => {
        const childIds = children.map((c) => c.id);
        return childIds.length > 0
          ? this.repo.deleteMany(childIds)
          : Effect.void;
      })
    );
  }
}

/**
 * Service tag for dependency injection
 */
export const TaskCommandService = Context.GenericTag<TaskCommandService>(
  "@app/TaskCommandService"
);

/**
 * Live implementation factory
 */
export const TaskCommandServiceLive = pipe(
  TaskRepositoryTag,
  Effect.map((repo) => new TaskCommandServiceImpl(repo))
);
