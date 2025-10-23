/**
 * React hook for Task Query operations (reads)
 * 
 * Phase 4: Hooks Refactoring - Query side
 * Replaces the read operations from useTaskHooks with Effect-based services
 */

import { useCallback } from "react";
import { Effect } from "effect";
import { runTask, runTaskSafe } from "./useTaskServices";
import { TaskQueryService } from "../services/TaskQueryService";
import { Task, TaskId, DueDate, ROOT_TASK_ID } from "../domain";
import { TaskTree } from "../calculations/TreeCalculations";
import { NotFoundError, DbError } from "../infrastructure/errors";

/**
 * Hook providing query operations for tasks
 * All operations return Promises for React compatibility
 */
export const useTaskQueries = () => {
  /**
   * Get a single task by ID
   */
  const getTask = useCallback(
    async (id: TaskId): Promise<Task> => {
      return runTask(
        Effect.gen(function* () {
          const queries = yield* TaskQueryService;
          return yield* queries.getTask(id);
        })
      );
    },
    []
  );

  /**
   * Get all tasks (excluding root)
   */
  const getAllTasks = useCallback(async (): Promise<ReadonlyArray<Task>> => {
    return runTask(
      Effect.gen(function* () {
        const queries = yield* TaskQueryService;
        return yield* queries.getAllTasks();
      })
    );
  }, []);

  /**
   * Get task tree starting from a root
   */
  const getTaskTree = useCallback(
    async (rootId: TaskId): Promise<TaskTree | null> => {
      const [result, error] = await runTaskSafe(
        Effect.gen(function* () {
          const queries = yield* TaskQueryService;
          return yield* queries.getTaskTree(rootId);
        })
      );

      if (error) {
        // NotFoundError means no tree, return null
        if ((error as any)._tag === "NotFoundError") {
          return null;
        }
        throw error;
      }

      return result;
    },
    []
  );

  /**
   * Get forest of root tasks
   */
  const getRootTaskForest = useCallback(
    async (): Promise<ReadonlyArray<TaskTree>> => {
      return runTask(
        Effect.gen(function* () {
          const queries = yield* TaskQueryService;
          return yield* queries.getRootTaskForest();
        })
      );
    },
    []
  );

  /**
   * Get root tasks (immediate children of ROOT)
   * Compatibility wrapper for old useTaskHooks API
   */
  const getRootTasks = useCallback(async (): Promise<Task[]> => {
    return runTask(
      Effect.gen(function* () {
        const queries = yield* TaskQueryService;
        const tasks = yield* queries.getChildren(ROOT_TASK_ID);
        return Array.from(tasks);
      })
    );
  }, []);

  /**
   * Get root task IDs
   * Compatibility wrapper for old useTaskHooks API
   */
  const getRootTaskIds = useCallback(async (): Promise<TaskId[]> => {
    const tasks = await getRootTasks();
    return tasks.map((t) => t.id);
  }, [getRootTasks]);

  /**
   * Get immediate children of a task
   * Replaces getImmediateChildren from old hook
   */
  const getImmediateChildren = useCallback(
    async (parentId: TaskId): Promise<Task[]> => {
      return runTask(
        Effect.gen(function* () {
          const queries = yield* TaskQueryService;
          const tasks = yield* queries.getChildren(parentId);
          return Array.from(tasks);
        })
      );
    },
    []
  );

  /**
   * Get all descendants (subtree) of a task
   * Replaces getSubtree from old hook
   */
  const getSubtree = useCallback(async (taskId: TaskId): Promise<Task[]> => {
    return runTask(
      Effect.gen(function* () {
        const queries = yield* TaskQueryService;
        const tasks = yield* queries.getDescendants(taskId);
        return Array.from(tasks);
      })
    );
  }, []);

  /**
   * Get all descendants (alias for getSubtree)
   */
  const getDescendants = getSubtree;

  /**
   * Get overdue tasks
   */
  const getOverdueTasks = useCallback(
    async (currentDate: DueDate): Promise<Task[]> => {
      return runTask(
        Effect.gen(function* () {
          const queries = yield* TaskQueryService;
          const tasks = yield* queries.getOverdueTasks(currentDate);
          return Array.from(tasks);
        })
      );
    },
    []
  );

  /**
   * Get tasks by state
   */
  const getTasksByState = useCallback(
    async (
      state: "NotStarted" | "InProgress" | "Blocked" | "Done"
    ): Promise<Task[]> => {
      return runTask(
        Effect.gen(function* () {
          const queries = yield* TaskQueryService;
          const tasks = yield* queries.getTasksByState(state);
          return Array.from(tasks);
        })
      );
    },
    []
  );

  /**
   * Search tasks by text
   */
  const searchTasks = useCallback(async (query: string): Promise<Task[]> => {
    return runTask(
      Effect.gen(function* () {
        const queries = yield* TaskQueryService;
        const tasks = yield* queries.searchTasks(query);
        return Array.from(tasks);
      })
    );
  }, []);

  return {
    // Core queries
    getTask,
    getAllTasks,
    getTaskTree,
    getRootTaskForest,

    // Compatibility with old API
    getRootTasks,
    getRootTaskIds,
    getImmediateChildren,
    getSubtree,
    getDescendants,

    // Advanced queries
    getOverdueTasks,
    getTasksByState,
    searchTasks,
  };
};
