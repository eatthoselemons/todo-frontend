import { useCallback } from 'react';
import * as yaml from 'js-yaml';
import { Task, TaskID, BaseState } from '../domain/Task';
import useTaskHooks from './useTaskHooks';
import {
  exportTaskToYaml,
  YamlTask,
} from '../../../utils/yamlConverter';

export interface UseYamlExportReturn {
  exportTask: (task: Task) => Promise<string>;
  importTask: (task: Task, yamlString: string) => Promise<void>;
}

/**
 * Hook for exporting and importing tasks to/from YAML
 * Optimized for performance using bulk database operations
 */
export function useYamlExport(): UseYamlExportReturn {
  const { getAllTasks, processBulkChanges } = useTaskHooks();

  /**
   * Export a task and its entire subtree to YAML
   */
  const exportTask = useCallback(
    async (task: Task): Promise<string> => {
      // Fetch all tasks once to avoid N+1 database queries
      const allTasks = await getAllTasks();

      // Build a map of all children recursively
      const childrenMap = new Map<TaskID, Task[]>();

      // Populate map with all tasks
      // We process all tasks to ensure we capture the full tree structure in memory
      for (const t of allTasks) {
        if (t.path.length > 1) {
          const parentId = t.path[t.path.length - 2];
          const siblings = childrenMap.get(parentId) || [];
          siblings.push(t);
          childrenMap.set(parentId, siblings);
        }
      }

      return exportTaskToYaml(task, childrenMap);
    },
    [getAllTasks]
  );

  /**
   * Import YAML and update the task and its subtree
   */
  const importTask = useCallback(
    async (rootTask: Task, yamlString: string): Promise<void> => {
      // 1. Fetch all existing tasks once
      const allTasks = await getAllTasks();

      // 2. Build in-memory map of existing children
      const childrenMap = new Map<TaskID, Task[]>();
      for (const t of allTasks) {
        if (t.path.length > 1) {
          const parentId = t.path[t.path.length - 2];
          const siblings = childrenMap.get(parentId) || [];
          siblings.push(t);
          childrenMap.set(parentId, siblings);
        }
      }

      const toSave: Task[] = [];
      const toDelete: Task[] = [];

      // 3. Helper to recursively reconcile YAML structure with existing tasks
      const reconcile = (
        parent: Task,
        yamlChildren: YamlTask[] = []
      ) => {
        const existingChildren = childrenMap.get(parent.id) || [];
        const matchedIds = new Set<TaskID>();

        // Process YAML children
        for (const yamlChild of yamlChildren) {
          let matchedChild: Task | undefined;

          // Try to match by ID
          if (yamlChild.id) {
            matchedChild = existingChildren.find((c) => c.id === yamlChild.id);
          }

          // Fallback: match by text
          if (!matchedChild) {
            // Match first child with same text that hasn't been matched yet
            matchedChild = existingChildren.find(
              (c) => c.text === yamlChild.text && !matchedIds.has(c.id)
            );
          }

          if (matchedChild) {
            // Update existing child
            matchedIds.add(matchedChild.id);
            let hasChanges = false;

            if (matchedChild.text !== yamlChild.text) {
              matchedChild.text = yamlChild.text;
              hasChanges = true;
            }

            if (yamlChild.state && matchedChild.internalState !== yamlChild.state) {
              // Basic validation/casting could be improved here
              matchedChild.internalState = yamlChild.state as BaseState;
              hasChanges = true;
            }

            if (yamlChild.dueDate !== undefined && matchedChild.dueDate !== yamlChild.dueDate) {
              matchedChild.dueDate = yamlChild.dueDate;
              hasChanges = true;
            }

            if (hasChanges) {
              toSave.push(matchedChild);
            }

            // Recursively process grandchildren
            reconcile(matchedChild, yamlChild.children);
          } else {
            // Create new child
            const newChild = new Task(
              yamlChild.text,
              (yamlChild.state as BaseState) || BaseState.NOT_STARTED,
              undefined, // Generate new ID
              [], // Path will be set below
              [],
              yamlChild.dueDate
            );
            
            // Set correct path based on parent
            newChild.path = [...parent.path, newChild.id];

            toSave.push(newChild);

            // Recursively create grandchildren
            reconcile(newChild, yamlChild.children);
          }
        }

        // Identify deletions: any existing child not matched in YAML
        for (const child of existingChildren) {
          if (!matchedIds.has(child.id)) {
            collectDeletes(child);
          }
        }
      };

      // Helper to collect tasks for deletion (including all descendants)
      const collectDeletes = (task: Task) => {
        toDelete.push(task);
        const children = childrenMap.get(task.id) || [];
        for (const child of children) {
          collectDeletes(child);
        }
      };

      // 4. Parse and process
      const yamlObj = yaml.load(yamlString) as YamlTask;
      if (!yamlObj || typeof yamlObj !== 'object') {
        throw new Error('Invalid YAML: must be an object');
      }

      // Update root task if needed
      let rootChanged = false;
      if (yamlObj.text && rootTask.text !== yamlObj.text) {
        rootTask.text = yamlObj.text;
        rootChanged = true;
      }
      if (yamlObj.state && rootTask.internalState !== yamlObj.state) {
        rootTask.internalState = yamlObj.state as BaseState;
        rootChanged = true;
      }
      if (yamlObj.dueDate !== undefined && rootTask.dueDate !== yamlObj.dueDate) {
        rootTask.dueDate = yamlObj.dueDate;
        rootChanged = true;
      }

      if (rootChanged) {
        toSave.push(rootTask);
      }

      // Start reconciliation from the root's children
      reconcile(rootTask, yamlObj.children);

      // 5. Execute bulk operation
      if (toSave.length > 0 || toDelete.length > 0) {
        await processBulkChanges(toSave, toDelete);
      }
    },
    [getAllTasks, processBulkChanges]
  );

  return {
    exportTask,
    importTask,
  };
}
