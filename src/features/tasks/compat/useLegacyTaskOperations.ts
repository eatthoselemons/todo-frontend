/**
 * Legacy Task Operations Hook
 * Wraps useTaskOperations to present old Task types to components
 * This allows incremental migration without breaking existing components
 */

import { useTaskOperations } from "../hooks/useTaskOperations";
import { newToOldTask, oldToNewTask, toBrandedTaskId } from "./LegacyTaskAdapter";
import { Task as OldTask, type TaskID } from "../../../domain/Task";
import type { Task as NewTask } from "../domain/TaskEntity";

export const useLegacyTaskOperations = () => {
  const ops = useTaskOperations();

  return {
    // Service status
    isReady: ops.isReady,

    // === QUERIES (map new Task -> old Task) ===

    getAllTasks: async (): Promise<OldTask[]> => {
      const tasks = await ops.getAllTasks();
      return tasks.map(newToOldTask);
    },

    getTask: async (id: TaskID): Promise<OldTask> => {
      const task = await ops.getTask(toBrandedTaskId(id));
      return newToOldTask(task);
    },

    getRootTasks: async (): Promise<OldTask[]> => {
      const tasks = await ops.getRootTasks();
      return tasks.map(newToOldTask);
    },

    getRootTaskIds: async (): Promise<TaskID[]> => {
      const ids = await ops.getRootTaskIds();
      return ids as TaskID[];
    },

    getImmediateChildren: async (parentId: TaskID): Promise<OldTask[]> => {
      const tasks = await ops.getImmediateChildren(toBrandedTaskId(parentId));
      return tasks.map(newToOldTask);
    },

    getSubtree: async (taskId: TaskID): Promise<OldTask[]> => {
      const tasks = await ops.getSubtree(toBrandedTaskId(taskId));
      return tasks.map(newToOldTask);
    },

    getDescendants: async (taskId: TaskID): Promise<OldTask[]> => {
      const tasks = await ops.getDescendants(toBrandedTaskId(taskId));
      return tasks.map(newToOldTask);
    },

    searchTasks: async (query: string): Promise<OldTask[]> => {
      const tasks = await ops.searchTasks(query);
      return tasks.map(newToOldTask);
    },

    // === COMMANDS (accept old Task, convert to new) ===

    createTask: async (
      taskOrText: OldTask | string,
      parentId?: TaskID
    ): Promise<string> => {
      // Handle old API: createTask(new Task(text), parentId)
      // or new API: createTask({ text, parentId, dueDate })
      let text: string;
      let parent: TaskID | undefined = parentId;
      let dueDate: string | undefined;

      if (typeof taskOrText === "string") {
        text = taskOrText;
      } else if (taskOrText instanceof OldTask) {
        text = taskOrText.text;
        dueDate = taskOrText.dueDate;
      } else {
        // It's a params object
        text = (taskOrText as any).text;
        parent = (taskOrText as any).parentId;
        dueDate = (taskOrText as any).dueDate;
      }

      const result = await ops.createTask({
        text,
        parentId: parent ? toBrandedTaskId(parent) : undefined,
        dueDate,
      });

      return result.id;
    },

    updateTask: async (task: OldTask): Promise<void> => {
      // Convert old task to new and update
      const newTask = oldToNewTask(task);
      await ops.updateTaskText(newTask.id, newTask.text);
      // Note: state updates should go through transitionTaskState
    },

    updateTaskText: async (taskId: TaskID, newText: string): Promise<NewTask> => {
      return ops.updateTaskText(toBrandedTaskId(taskId), newText);
    },

    deleteTask: async (taskId: TaskID): Promise<void> => {
      return ops.deleteTask(toBrandedTaskId(taskId));
    },

    moveTask: async (taskId: TaskID, newParentId: TaskID): Promise<void> => {
      return ops.moveTask(toBrandedTaskId(taskId), toBrandedTaskId(newParentId));
    },

    clearSubtasks: async (taskId: TaskID): Promise<void> => {
      return ops.clearSubtasks(toBrandedTaskId(taskId));
    },

    completeTask: async (taskId: TaskID): Promise<NewTask> => {
      return ops.completeTask(toBrandedTaskId(taskId));
    },

    setTaskDueDate: async (taskId: TaskID, dueDate?: string): Promise<NewTask> => {
      return ops.setTaskDueDate(toBrandedTaskId(taskId), dueDate);
    },
  };
};

export default useLegacyTaskOperations;
