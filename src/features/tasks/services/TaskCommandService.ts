/**
 * Task Command Service - Write operations
 * Uses Repository (database I/O) + Domain logic
 */

import { Effect, pipe, Context } from "effect";
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
import { TaskRepository } from "../infrastructure/TaskRepository";
import {
  NotFoundError,
  DbError,
  ConstraintViolationError,
} from "../infrastructure/errors";
import {
  buildChildPath,
  calculateDescendantPathAfterMove,
} from "../calculations/PathCalculations";
import { getAllDescendants } from "../calculations/TreeCalculations";

/**
 * Task Command Service interface
 */
export interface TaskCommandService {
  readonly createTask: (params: {
    text: string;
    parentId?: TaskId;
    dueDate?: string;
  }) => Effect.Effect<Task, DbError | NotFoundError | InvalidTaskTextError>;
  readonly updateTaskText: (
    taskId: TaskId,
    newText: string
  ) => Effect.Effect<Task, DbError | NotFoundError | InvalidTaskTextError>;
  readonly transitionTaskState: (
    taskId: TaskId,
    newState: TaskState
  ) => Effect.Effect<Task, DbError | NotFoundError | InvalidStateTransitionError>;
  readonly completeTask: (
    taskId: TaskId
  ) => Effect.Effect<Task, DbError | NotFoundError | InvalidStateTransitionError>;
  readonly setTaskDueDate: (
    taskId: TaskId,
    dueDate?: string
  ) => Effect.Effect<Task, DbError | NotFoundError>;
  readonly moveTask: (
    taskId: TaskId,
    newParentId: TaskId
  ) => Effect.Effect<void, DbError | NotFoundError | ConstraintViolationError>;
  readonly deleteTask: (
    taskId: TaskId
  ) => Effect.Effect<void, DbError | ConstraintViolationError>;
  readonly clearSubtasks: (
    taskId: TaskId
  ) => Effect.Effect<void, DbError | NotFoundError>;
}

export const TaskCommandService = Context.GenericTag<TaskCommandService>(
  "TaskCommandService"
);

/**
 * Ensure root task exists (business logic - not in Repository)
 * Idempotent - safe to call multiple times
 */
const ensureRootExists =
  (repo: TaskRepository) =>
  (): Effect.Effect<void, DbError | InvalidTaskTextError> =>
    Effect.gen(function* () {
      const exists = yield* repo.exists(ROOT_TASK_ID);
      if (exists) {
        return;
      }

      const rootTask = yield* createTask({
        text: "root",
        parentPath: [] as any as TaskPath,
        dueDate: undefined,
      });

      const root = {
        ...rootTask,
        id: ROOT_TASK_ID,
        path: makeTaskPath([ROOT_TASK_ID]),
      };

      yield* repo.save(root);
    });

/**
 * Creates the service implementation with the given repository
 */
export const make = (repo: TaskRepository): TaskCommandService => {
  const ensureRoot = ensureRootExists(repo);

  const createTask_ = (params: {
    text: string;
    parentId?: TaskId;
    dueDate?: string;
  }) => {
    const parentId = params.parentId ?? ROOT_TASK_ID;

    return pipe(
      ensureRoot(),
      Effect.flatMap(() => repo.getById(parentId)),
      Effect.catchTag("NotFoundError", () =>
        Effect.fail(
          new InvalidTaskTextError(`Parent task not found: ${parentId}`)
        )
      ),
      Effect.flatMap((parent) =>
        createTask({
          text: params.text,
          parentPath: parent.path,
          dueDate: params.dueDate,
        })
      ),
      Effect.tap((task) => repo.save(task))
    );
  };

  const updateTaskText = (taskId: TaskId, newText: string) =>
    pipe(
      repo.getById(taskId),
      Effect.flatMap((task) => updateText(task, newText)),
      Effect.tap((updated) => repo.save(updated))
    );

  const transitionTaskState = (taskId: TaskId, newState: TaskState) =>
    pipe(
      repo.getById(taskId),
      Effect.flatMap((task) => transitionState(task, newState)),
      Effect.tap((updated) => repo.save(updated))
    );

  const completeTask_ = (taskId: TaskId) =>
    pipe(
      repo.getById(taskId),
      Effect.flatMap((task) => completeTask(task)),
      Effect.tap((updated) => repo.save(updated))
    );

  const setTaskDueDate = (taskId: TaskId, dueDate?: string) =>
    pipe(
      repo.getById(taskId),
      Effect.flatMap((task) => setDueDate(task, dueDate)),
      Effect.tap((updated) => repo.save(updated))
    );

  const moveTask = (taskId: TaskId, newParentId: TaskId) => {
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
        task: repo.getById(taskId),
        newParent: repo.getById(newParentId),
        allTasks: repo.getAll(),
      }),
      Effect.flatMap(
        ({
          task,
          newParent,
          allTasks,
        }): Effect.Effect<void, ConstraintViolationError | DbError> => {
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

          return repo.saveMany([updatedTask, ...updatedDescendants]);
        }
      )
    );
  };

  const deleteTask = (taskId: TaskId) => {
    if (taskId === ROOT_TASK_ID) {
      return Effect.fail(
        ConstraintViolationError.make(
          "cannot-delete-root",
          "Cannot delete root task"
        )
      );
    }

    return pipe(
      repo.getAll(),
      Effect.flatMap((allTasks) => {
        const descendants = getAllDescendants(allTasks, taskId);
        const idsToDelete = [taskId, ...descendants.map((d) => d.id)];
        return repo.deleteMany(idsToDelete);
      })
    );
  };

  const clearSubtasks = (taskId: TaskId) =>
    pipe(
      repo.getImmediateChildren(taskId),
      Effect.flatMap((children) => {
        const childIds = children.map((c) => c.id);
        return childIds.length > 0 ? repo.deleteMany(childIds) : Effect.void;
      })
    );

  return {
    createTask: createTask_,
    updateTaskText,
    transitionTaskState,
    completeTask: completeTask_,
    setTaskDueDate,
    moveTask,
    deleteTask,
    clearSubtasks,
  };
};
