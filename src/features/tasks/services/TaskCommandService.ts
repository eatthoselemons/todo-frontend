/**
 * Task Command Service - Write operations
 * Uses Repository (database I/O) + Domain logic
 */

import { Effect, pipe, Layer } from "effect";
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
 * Task Command Service
 * Follows Effect.Service pattern for proper dependency injection
 */
export class TaskCommandService extends Effect.Service<TaskCommandService>()(
  "TaskCommandService",
  {
    effect: Effect.gen(function* () {
      const repo = yield* TaskRepository;

      /**
       * Ensure root task exists (business logic - not in Repository)
       * Idempotent - safe to call multiple times
       */
      const ensureRootExists = (): Effect.Effect<void, DbError | InvalidTaskTextError> =>
        pipe(
          repo.exists(ROOT_TASK_ID),
          Effect.flatMap((exists) => {
            if (exists) {
              return Effect.void;
            }

            // Create root task using domain logic
            return pipe(
              createTask({
                text: "root",
                parentPath: [] as any as TaskPath,
                dueDate: undefined,
              }),
              Effect.flatMap((rootTask) => {
                // Override the generated ID with ROOT_TASK_ID
                const root = { ...rootTask, id: ROOT_TASK_ID, path: makeTaskPath([ROOT_TASK_ID]) };
                return repo.save(root);
              })
            );
          })
        );

      const createTask_ = (params: {
        text: string;
        parentId?: TaskId;
        dueDate?: string;
      }) => {
        const parentId = params.parentId ?? ROOT_TASK_ID;

        return pipe(
          ensureRootExists(),
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
            return childIds.length > 0
              ? repo.deleteMany(childIds)
              : Effect.void;
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
      } as const;
    }),
    dependencies: [],
  }
) {}
