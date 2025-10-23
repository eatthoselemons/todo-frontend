/**
 * Hook for exporting and importing tasks to/from YAML
 * Uses new Effect-based YAML converter with legacy task adapter
 */

import { useCallback } from "react";
import { Task as OldTask, type TaskID } from "../../../domain/Task";
import { useLegacyTaskOperations } from "../compat/useLegacyTaskOperations";
import { exportTaskToYaml, importTaskFromYaml } from "../yaml/YamlConverter";
import { newToOldTask, oldToNewTask } from "../compat/LegacyTaskAdapter";
import { YamlChildToCreate } from "../yaml/YamlSchema";
import { Effect } from "effect";
import { Task as NewTask } from "../domain/TaskEntity";

export interface UseYamlExportReturn {
  exportTask: (task: OldTask) => Promise<string>;
  importTask: (task: OldTask, yamlString: string) => Promise<void>;
}

/**
 * Hook for exporting and importing tasks to/from YAML
 */
export function useYamlExport(): UseYamlExportReturn {
  const { getImmediateChildren, updateTask, createTask, deleteTask } =
    useLegacyTaskOperations();

  /**
   * Export a task and its entire subtree to YAML
   */
  const exportTask = useCallback(
    async (task: OldTask): Promise<string> => {
      // Convert to new task type
      const newTask = oldToNewTask(task);

      // Build a map of all children recursively
      const childrenMap = new Map<string, NewTask[]>();

      // Recursive function to fetch all descendants
      const fetchChildren = async (parentTask: NewTask): Promise<void> => {
        const children = await getImmediateChildren(parentTask.id as TaskID);
        const newChildren = children.map(oldToNewTask);

        if (newChildren.length > 0) {
          childrenMap.set(parentTask.id, newChildren);

          // Recursively fetch grandchildren
          for (const child of newChildren) {
            await fetchChildren(child);
          }
        }
      };

      await fetchChildren(newTask);

      return exportTaskToYaml(newTask, childrenMap as any);
    },
    [getImmediateChildren]
  );

  /**
   * Import YAML and update the task and its subtree
   */
  const importTask = useCallback(
    async (task: OldTask, yamlString: string): Promise<void> => {
      // Convert to new task type
      const newTask = oldToNewTask(task);

      // Get existing children
      const existingChildren = await getImmediateChildren(task.id);
      const newChildren = existingChildren.map(oldToNewTask);
      const existingChildrenMap = new Map(
        newChildren.map((child) => [child.id, child])
      );

      // Parse the YAML using Effect
      const parseEffect = importTaskFromYaml(
        yamlString,
        newTask,
        existingChildrenMap
      );

      // Run the Effect and handle errors
      const parseResult = await Effect.runPromise(
        parseEffect.pipe(
          Effect.mapError((error) => {
            throw new Error(error.message);
          })
        )
      );

      // Update the root task
      if (parseResult.updatedTask.text) {
        const updatedOldTask = OldTask.from({
          ...task,
          text: parseResult.updatedTask.text,
          internalState: parseResult.updatedTask.state
            ? mapStateToLegacy(parseResult.updatedTask.state)
            : task.internalState,
          dueDate: parseResult.updatedTask.dueDate,
        });
        await updateTask(updatedOldTask);
      }

      // Delete children that are no longer in the YAML
      for (const childId of parseResult.childrenToDelete) {
        await deleteTask(childId as TaskID);
      }

      // Update existing children
      for (const childUpdate of parseResult.childrenToUpdate) {
        const existingChild = existingChildren.find(
          (c) => c.id === childUpdate.id
        );
        if (existingChild) {
          const updatedChild = OldTask.from({
            ...existingChild,
            text: childUpdate.updates.text,
            internalState: childUpdate.updates.state
              ? mapStateToLegacy(childUpdate.updates.state)
              : existingChild.internalState,
            dueDate: childUpdate.updates.dueDate,
          });
          await updateTask(updatedChild);

          // Handle nested children
          if (childUpdate.children) {
            const updatedOldChild = await getImmediateChildren(
              childUpdate.id as TaskID
            ).then((children) => children.find((c) => c.id === childUpdate.id));
            if (updatedOldChild) {
              for (const childData of childUpdate.children) {
                await createNestedTask(updatedOldChild, childData);
              }
            }
          }
        }
      }

      // Create new children
      for (const childToCreate of parseResult.childrenToCreate) {
        await createNestedTask(task, childToCreate);
      }
    },
    [getImmediateChildren, updateTask, createTask, deleteTask]
  );

  /**
   * Recursively create a task and its children
   */
  const createNestedTask = useCallback(
    async (parent: OldTask, taskData: YamlChildToCreate): Promise<void> => {
      // Create the task
      const { BaseState } = require("../../../domain/Task");
      const newTask = new OldTask(
        taskData.text,
        taskData.state ? mapStateToLegacy(taskData.state) : BaseState.NOT_STARTED,
        undefined,
        [],
        [],
        taskData.dueDate
      );
      const newTaskId = await createTask(newTask, parent.id);

      // Get the created task to pass to children
      const createdTasks = await getImmediateChildren(parent.id);
      const createdTask = createdTasks.find((t) => t.id === newTaskId);

      // Create children recursively
      if (createdTask && taskData.children && taskData.children.length > 0) {
        for (const childData of taskData.children) {
          await createNestedTask(createdTask, childData);
        }
      }
    },
    [createTask, getImmediateChildren]
  );

  return {
    exportTask,
    importTask,
  };
}

/**
 * Map new TaskState to legacy BaseState
 */
function mapStateToLegacy(
  state: NonNullable<YamlChildToCreate["state"]>
): any {
  const { BaseState } = require("../../../domain/Task");
  switch (state._tag) {
    case "NotStarted":
      return BaseState.NOT_STARTED;
    case "InProgress":
      return BaseState.IN_PROGRESS;
    case "Blocked":
      return BaseState.BLOCKED;
    case "Done":
      return BaseState.DONE;
    default:
      return BaseState.NOT_STARTED;
  }
}
