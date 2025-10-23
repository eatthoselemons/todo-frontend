/**
 * Hook for exporting and importing tasks to/from YAML
 * Works directly with new Task types (no legacy adapter needed)
 */

import { useCallback } from "react";
import { Task, TaskId } from "../domain";
import { useTaskQueries, useTaskCommands } from ".";
import { exportTaskToYaml, importTaskFromYaml } from "../yaml/YamlConverter";
import { YamlChildOperation } from "../yaml/YamlSchema";
import { Effect } from "effect";
import { TaskState } from "../domain/TaskState";

export interface UseYamlExportReturn {
  exportTask: (task: Task) => Promise<string>;
  importTask: (task: Task, yamlString: string) => Promise<void>;
}

/**
 * Hook for exporting and importing tasks to/from YAML
 */
export function useYamlExport(): UseYamlExportReturn {
  const { getImmediateChildren } = useTaskQueries();
  const { updateTaskText, transitionTaskState, setTaskDueDate, createTask, deleteTask } = useTaskCommands();

  /**
   * Export a task and its entire subtree to YAML
   */
  const exportTask = useCallback(
    async (task: Task): Promise<string> => {
      // Build a map of all children recursively
      const childrenMap = new Map<TaskId, Task[]>();

      // Recursive function to fetch all descendants
      const fetchChildren = async (parentTask: Task): Promise<void> => {
        const children = await getImmediateChildren(parentTask.id);

        if (children.length > 0) {
          childrenMap.set(parentTask.id, Array.from(children));

          // Recursively fetch grandchildren
          for (const child of children) {
            await fetchChildren(child);
          }
        }
      };

      await fetchChildren(task);

      return exportTaskToYaml(task, childrenMap);
    },
    [getImmediateChildren]
  );

  /**
   * Import YAML and update the task and its subtree
   */
  const importTask = useCallback(
    async (task: Task, yamlString: string): Promise<void> => {
      // Get existing children
      const existingChildren = await getImmediateChildren(task.id);
      const existingChildrenMap = new Map(
        Array.from(existingChildren).map((child) => [child.id, child])
      );

      // Parse the YAML using Effect
      const parseEffect = importTaskFromYaml(
        yamlString,
        task,
        existingChildrenMap
      );

      // Run the Effect and handle errors
      const parseResult = await Effect.runPromise(
        parseEffect.pipe(
          Effect.catchAll((error) =>
            Effect.fail(new Error(`YAML ${error._tag}: ${error.message}`))
          )
        )
      );

      // Update the root task
      if (parseResult.updatedTask.text) {
        await updateTaskText(task.id, parseResult.updatedTask.text);
      }
      if (parseResult.updatedTask.state) {
        await transitionTaskState(task.id, parseResult.updatedTask.state);
      }
      if (parseResult.updatedTask.dueDate !== undefined) {
        await setTaskDueDate(task.id, parseResult.updatedTask.dueDate);
      }

      // Delete children that are no longer in the YAML
      for (const childId of parseResult.childrenToDelete) {
        await deleteTask(childId as TaskId);
      }

      // Update existing children
      for (const childUpdate of parseResult.childrenToUpdate) {
        if (childUpdate.text) {
          await updateTaskText(childUpdate.id as TaskId, childUpdate.text);
        }
        if (childUpdate.state) {
          await transitionTaskState(childUpdate.id as TaskId, childUpdate.state);
        }
        if (childUpdate.dueDate !== undefined) {
          await setTaskDueDate(childUpdate.id as TaskId, childUpdate.dueDate);
        }

        // Handle nested children
        if (childUpdate.children) {
          for (const childData of childUpdate.children) {
            await createNestedTask(childUpdate.id as TaskId, childData);
          }
        }
      }

      // Create new children
      for (const childToCreate of parseResult.childrenToCreate) {
        await createNestedTask(task.id, childToCreate);
      }
    },
    [getImmediateChildren, updateTaskText, transitionTaskState, setTaskDueDate, createTask, deleteTask]
  );

  /**
   * Recursively create a task and its children
   */
  const createNestedTask = useCallback(
    async (parentId: TaskId, taskData: YamlChildOperation): Promise<void> => {
      // Create the task
      const newTask = await createTask({
        text: taskData.text,
        parentId,
        dueDate: taskData.dueDate,
      });

      // Set state if not default
      if (taskData.state && taskData.state._tag !== "NotStarted") {
        await transitionTaskState(newTask.id, taskData.state);
      }

      // Create children recursively
      if (taskData.children && taskData.children.length > 0) {
        for (const childData of taskData.children) {
          await createNestedTask(newTask.id, childData);
        }
      }
    },
    [createTask, transitionTaskState]
  );

  return {
    exportTask,
    importTask,
  };
}
