/**
 * Task Query Service - Read operations
 * Uses Repository (database I/O) + Calculations (pure logic)
 */

import { Effect, pipe, Context } from "effect";
import { Task, TaskId, DueDate } from "../domain";
import { TaskRepository } from "../infrastructure/TaskRepository";
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
 * Task Query Service interface
 */
export interface TaskQueryService {
  readonly getTask: (
    id: TaskId
  ) => Effect.Effect<Task, DbError | NotFoundError>;
  readonly getAllTasks: () => Effect.Effect<readonly Task[], DbError>;
  readonly getTaskTree: (
    rootId: TaskId
  ) => Effect.Effect<TaskTree, DbError | NotFoundError>;
  readonly getRootTaskForest: () => Effect.Effect<readonly TaskTree[], DbError>;
  readonly getChildren: (
    parentId: TaskId
  ) => Effect.Effect<readonly Task[], DbError | NotFoundError>;
  readonly getDescendants: (
    ancestorId: TaskId
  ) => Effect.Effect<readonly Task[], DbError>;
  readonly getOverdueTasks: (
    currentDate: DueDate
  ) => Effect.Effect<readonly Task[], DbError>;
  readonly getTasksByState: (
    state: "NotStarted" | "InProgress" | "Blocked" | "Done"
  ) => Effect.Effect<readonly Task[], DbError>;
  readonly searchTasks: (
    query: string
  ) => Effect.Effect<readonly Task[], DbError>;
}

export const TaskQueryService =
  Context.GenericTag<TaskQueryService>("TaskQueryService");

/**
 * Creates the service implementation with the given repository
 */
export const make = (repo: TaskRepository): TaskQueryService => {
  const getTask = (id: TaskId) => repo.getById(id);

  const getAllTasks = () => repo.getAll();

  const getTaskTree = (rootId: TaskId) =>
    pipe(
      repo.getAll(),
      Effect.map((allTasks) => buildTaskTree(allTasks, rootId)),
      Effect.flatMap((tree) =>
        tree ? Effect.succeed(tree) : Effect.fail(NotFoundError.make(rootId))
      )
    );

  const getRootTaskForest = () =>
    pipe(
      Effect.all([repo.getRootTasks(), repo.getAll()]),
      Effect.map(([rootTasks, allTasks]) => {
        const rootIds = rootTasks.map((t) => t.id);
        return buildTaskForest(allTasks, rootIds);
      })
    );

  const getChildren = (parentId: TaskId) => repo.getImmediateChildren(parentId);

  const getDescendants = (ancestorId: TaskId) =>
    pipe(
      repo.getAll(),
      Effect.map((allTasks) =>
        allTasks.filter(
          (task) => task.path.includes(ancestorId) && task.id !== ancestorId
        )
      )
    );

  const getOverdueTasks = (currentDate: DueDate) =>
    pipe(
      repo.getAll(),
      Effect.map((allTasks) =>
        allTasks
          .filter((task) => isTaskOverdue(task, currentDate))
          .sort(compareByDueDate)
      )
    );

  const getTasksByState = (
    state: "NotStarted" | "InProgress" | "Blocked" | "Done"
  ) =>
    pipe(
      repo.getAll(),
      Effect.map((allTasks) =>
        allTasks
          .filter((task) => task.state._tag === state)
          .sort(compareByCreationDate)
      )
    );

  const searchTasks = (query: string) =>
    pipe(
      repo.getAll(),
      Effect.map((allTasks) => {
        const lowerQuery = query.toLowerCase();
        return allTasks.filter((task) =>
          task.text.toLowerCase().includes(lowerQuery)
        );
      })
    );

  return {
    getTask,
    getAllTasks,
    getTaskTree,
    getRootTaskForest,
    getChildren,
    getDescendants,
    getOverdueTasks,
    getTasksByState,
    searchTasks,
  };
};
