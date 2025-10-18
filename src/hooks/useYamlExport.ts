import { useCallback } from 'react';
import { Task, TaskID } from '../features/tasks/domain/Task';
import useTaskHooks from './useTaskHooks';
import {
  exportTaskToYaml,
  importTaskFromYaml,
  YamlParseResult,
} from '../utils/yamlConverter';

export interface UseYamlExportReturn {
  exportTask: (task: Task) => Promise<string>;
  importTask: (task: Task, yamlString: string) => Promise<void>;
}

/**
 * Hook for exporting and importing tasks to/from YAML
 */
export function useYamlExport(): UseYamlExportReturn {
  const { getImmediateChildren, updateTask, createTask, deleteTask } =
    useTaskHooks();

  /**
   * Export a task and its entire subtree to YAML
   */
  const exportTask = useCallback(
    async (task: Task): Promise<string> => {
      // Build a map of all children recursively
      const childrenMap = new Map<TaskID, Task[]>();

      // Recursive function to fetch all descendants
      const fetchChildren = async (parentTask: Task): Promise<void> => {
        // Build a map of all children recursively
        const children = await getImmediateChildren(parentTask.id);
        if (children.length > 0) {
          childrenMap.set(parentTask.id, children);

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
        existingChildren.map((child) => [child.id, child])
      );

      // Parse the YAML
      const parseResult = importTaskFromYaml(
        yamlString,
        task,
        existingChildrenMap
      );

      // Update the root task
      if (Object.keys(parseResult.updatedTask).length > 0) {
        const updatedTaskObj = Object.assign(task, parseResult.updatedTask);
        await updateTask(updatedTaskObj);
      }

      // Delete children that are no longer in the YAML
      for (const childId of parseResult.childrenToDelete) {
        await deleteTask(childId);
      }

      // Update existing children
      for (const childUpdate of parseResult.childrenToUpdate) {
        const existingChild = existingChildrenMap.get(childUpdate.id);
        if (existingChild) {
          const updatedChild = Object.assign(existingChild, childUpdate.updates);
          await updateTask(updatedChild);

          // Handle nested children updates/creates
          if (childUpdate.children) {
            await createNestedChildren(
              updatedChild,
              childUpdate.children
            );
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
    async (
      parent: Task,
      taskData: YamlParseResult['childrenToCreate'][0]
    ): Promise<void> => {
      // Create the task
      const newTask = new Task(
        taskData.task.text || '',
        taskData.task.internalState,
        undefined, // Let it generate its own ID
        [], // Path will be set by createTask
        [],
        taskData.task.dueDate
      );

      await createTask(newTask, parent.id);

      // Create children recursively
      if (taskData.children && taskData.children.length > 0) {
        for (const childData of taskData.children) {
          await createNestedTask(newTask, childData);
        }
      }
    },
    [createTask]
  );

  /**
   * Create nested children for an existing task (used when updating)
   */
  const createNestedChildren = useCallback(
    async (
      parent: Task,
      childrenData: YamlParseResult['childrenToCreate']
    ): Promise<void> => {
      // First, get existing children to compare
      const existingChildren = await getImmediateChildren(parent.id);
      const existingChildrenByText = new Map(
        existingChildren.map((child) => [child.text, child])
      );

      for (const childData of childrenData) {
        const existingChild = existingChildrenByText.get(
          childData.task.text || ''
        );

        if (existingChild) {
          // Update existing child
          const updatedChild = Object.assign(existingChild, childData.task);
          await updateTask(updatedChild);

          // Recursively handle grandchildren
          if (childData.children && childData.children.length > 0) {
            await createNestedChildren(updatedChild, childData.children);
          }
        } else {
          // Create new child
          await createNestedTask(parent, childData);
        }
      }
    },
    [getImmediateChildren, updateTask, createTask]
  );

  return {
    exportTask,
    importTask,
  };
}
