/**
 * React hook for Task Command operations (writes)
 * 
 * Phase 4: Hooks Refactoring - Command side
 * Replaces the write operations from useTaskHooks with Effect-based services
 */

import { useCallback } from "react";
import { Effect } from "effect";
import { runTask } from "./useTaskServices";
import { TaskCommandService } from "../services/TaskCommandService";
import { Task, TaskId, TaskState, ROOT_TASK_ID } from "../domain";

/**
 * Hook providing command operations for tasks
 * All operations return Promises for React compatibility
 */
export const useTaskCommands = () => {
  /**
   * Create a new task
   * Replaces createTask from old hook
   */
  const createTask = useCallback(
    async (params: {
      text: string;
      parentId?: TaskId;
      dueDate?: string;
    }): Promise<Task> => {
      return runTask(
        Effect.gen(function* () {
          const commands = yield* TaskCommandService;
          return yield* commands.createTask(params);
        })
      );
    },
    []
  );

  /**
   * Update task text
   */
  const updateTaskText = useCallback(
    async (taskId: TaskId, newText: string): Promise<Task> => {
      return runTask(
        Effect.gen(function* () {
          const commands = yield* TaskCommandService;
          return yield* commands.updateTaskText(taskId, newText);
        })
      );
    },
    []
  );

  /**
   * Transition task to new state
   */
  const transitionTaskState = useCallback(
    async (taskId: TaskId, newState: TaskState): Promise<Task> => {
      return runTask(
        Effect.gen(function* () {
          const commands = yield* TaskCommandService;
          return yield* commands.transitionTaskState(taskId, newState);
        })
      );
    },
    []
  );

  /**
   * Complete a task
   */
  const completeTask = useCallback(async (taskId: TaskId): Promise<Task> => {
    return runTask(
      Effect.gen(function* () {
        const commands = yield* TaskCommandService;
        return yield* commands.completeTask(taskId);
      })
    );
  }, []);

  /**
   * Set task due date
   */
  const setTaskDueDate = useCallback(
    async (taskId: TaskId, dueDate?: string): Promise<Task> => {
      return runTask(
        Effect.gen(function* () {
          const commands = yield* TaskCommandService;
          return yield* commands.setTaskDueDate(taskId, dueDate);
        })
      );
    },
    []
  );

  /**
   * Move task to new parent
   * Replaces moveTask from old hook
   */
  const moveTask = useCallback(
    async (taskId: TaskId, newParentId: TaskId): Promise<void> => {
      return runTask(
        Effect.gen(function* () {
          const commands = yield* TaskCommandService;
          return yield* commands.moveTask(taskId, newParentId);
        })
      );
    },
    []
  );

  /**
   * Delete task and all descendants
   * Replaces deleteTask from old hook
   */
  const deleteTask = useCallback(async (taskId: TaskId): Promise<void> => {
    return runTask(
      Effect.gen(function* () {
        const commands = yield* TaskCommandService;
        return yield* commands.deleteTask(taskId);
      })
    );
  }, []);

  /**
   * Clear all subtasks (delete children but keep task)
   */
  const clearSubtasks = useCallback(async (taskId: TaskId): Promise<void> => {
    return runTask(
      Effect.gen(function* () {
        const commands = yield* TaskCommandService;
        return yield* commands.clearSubtasks(taskId);
      })
    );
  }, []);

  /**
   * Update task (compatibility with old API)
   * Maps to appropriate specific update based on what changed
   */
  const updateTask = useCallback(
    async (task: Task): Promise<void> => {
      // For now, just update text and state
      // In the future, this could be split into specific updates
      await updateTaskText(task.id, task.text);

      // Update state if needed
      if (task.state) {
        await transitionTaskState(task.id, task.state);
      }
    },
    [updateTaskText, transitionTaskState]
  );

  return {
    // Create
    createTask,

    // Update operations
    updateTask,
    updateTaskText,
    transitionTaskState,
    completeTask,
    setTaskDueDate,

    // Structure operations
    moveTask,
    deleteTask,
    clearSubtasks,
  };
};
