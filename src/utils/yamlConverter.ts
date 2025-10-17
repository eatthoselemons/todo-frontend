import * as yaml from 'js-yaml';
import { Task, ITask, BaseState } from '../domain/Task';
import { TaskID } from '../domain/Task';

/**
 * Simplified YAML representation of a task without internal metadata
 */
export interface YamlTask {
  id?: string;
  text: string;
  state?: string;
  dueDate?: string;
  children?: YamlTask[];
}

/**
 * Converts a task and its subtree to YAML format
 * @param task The root task to export
 * @param childrenMap Map of taskId to its immediate children
 * @returns YAML string representation
 */
export function exportTaskToYaml(
  task: Task,
  childrenMap: Map<TaskID, Task[]>
): string {
  const yamlTask = convertTaskToYamlObject(task, childrenMap);
  return yaml.dump(yamlTask, {
    indent: 2,
    lineWidth: -1, // Don't wrap long lines
    noRefs: true, // Don't use references
    sortKeys: false, // Maintain order
  });
}

/**
 * Recursively converts a task and its children to a YamlTask object
 */
function convertTaskToYamlObject(
  task: Task,
  childrenMap: Map<TaskID, Task[]>
): YamlTask {
  const yamlTask: YamlTask = {
    text: task.text,
  };

  // Only include state if it's not the default (NOT_STARTED)
  if (task.internalState !== BaseState.NOT_STARTED) {
    yamlTask.state = task.internalState;
  }

  // Only include dueDate if it exists
  if (task.dueDate) {
    yamlTask.dueDate = task.dueDate;
  }

  // Get immediate children and convert them recursively
  const children = childrenMap.get(task.id) || [];
  if (children.length > 0) {
    yamlTask.children = children
      .sort((a, b) => {
        // Sort by creation time (based on changelog if available)
        const aTime = a.changeLog[0]?.time || 0;
        const bTime = b.changeLog[0]?.time || 0;
        return aTime - bTime;
      })
      .map((child) => convertTaskToYamlObject(child, childrenMap));
  }

  return yamlTask;
}

/**
 * Parse result containing the updated task and new children to create
 */
export interface YamlParseResult {
  updatedTask: Partial<ITask>;
  childrenToCreate: Array<{
    task: Partial<ITask>;
    children?: YamlParseResult['childrenToCreate'];
  }>;
  childrenToUpdate: Array<{
    id: TaskID;
    updates: Partial<ITask>;
    children?: YamlParseResult['childrenToCreate'];
  }>;
  childrenToDelete: TaskID[];
}

/**
 * Imports a YAML string and converts it back to task structure
 * @param yamlString The YAML string to parse
 * @param existingTask The existing task to update (for preserving id and path)
 * @param existingChildrenMap Map of existing children by their ID
 * @returns Parse result with updates and new children
 */
export function importTaskFromYaml(
  yamlString: string,
  existingTask: Task,
  existingChildrenMap: Map<TaskID, Task>
): YamlParseResult {
  const yamlTask = yaml.load(yamlString) as YamlTask;

  if (!yamlTask || typeof yamlTask !== 'object') {
    throw new Error('Invalid YAML: must be an object');
  }

  if (!yamlTask.text || typeof yamlTask.text !== 'string') {
    throw new Error('Invalid YAML: text field is required and must be a string');
  }

  // Validate state if provided
  if (yamlTask.state) {
    const validStates = Object.values(BaseState);
    if (!validStates.includes(yamlTask.state as BaseState)) {
      throw new Error(
        `Invalid state: ${yamlTask.state}. Valid states are: ${validStates.join(', ')}`
      );
    }
  }

  // Parse the root task updates
  const updatedTask: Partial<ITask> = {
    text: yamlTask.text,
  };

  if (yamlTask.state) {
    updatedTask.internalState = yamlTask.state as BaseState;
  }

  if (yamlTask.dueDate !== undefined) {
    updatedTask.dueDate = yamlTask.dueDate || undefined;
  }

  // Process children
  const result = processYamlChildren(
    yamlTask.children || [],
    existingChildrenMap,
    existingTask
  );

  return {
    updatedTask,
    childrenToCreate: result.toCreate,
    childrenToUpdate: result.toUpdate,
    childrenToDelete: result.toDelete,
  };
}

interface ChildProcessResult {
  toCreate: YamlParseResult['childrenToCreate'];
  toUpdate: YamlParseResult['childrenToUpdate'];
  toDelete: TaskID[];
}

/**
 * Process YAML children and determine what needs to be created, updated, or deleted
 */
function processYamlChildren(
  yamlChildren: YamlTask[],
  existingChildrenMap: Map<TaskID, Task>,
  parentTask: Task
): ChildProcessResult {
  const toCreate: YamlParseResult['childrenToCreate'] = [];
  const toUpdate: YamlParseResult['childrenToUpdate'] = [];
  const matchedIds = new Set<TaskID>();

  // Match YAML children with existing children by ID (preferred) or text (fallback)
  for (const yamlChild of yamlChildren) {
    let matchedChild: Task | undefined;

    // First, try to match by ID if provided
    if (yamlChild.id && existingChildrenMap.has(yamlChild.id)) {
      matchedChild = existingChildrenMap.get(yamlChild.id);
      matchedIds.add(yamlChild.id);
    } else {
      // Fallback: match by text for backwards compatibility
      for (const [id, existingChild] of existingChildrenMap) {
        if (
          existingChild.text === yamlChild.text &&
          !matchedIds.has(id)
        ) {
          matchedChild = existingChild;
          matchedIds.add(id);
          break;
        }
      }
    }

    if (matchedChild) {
      // Update existing child
      const updates: Partial<ITask> = {
        text: yamlChild.text,
      };

      if (yamlChild.state) {
        updates.internalState = yamlChild.state as BaseState;
      }

      if (yamlChild.dueDate !== undefined) {
        updates.dueDate = yamlChild.dueDate || undefined;
      }

      // Recursively process grandchildren (we'll need to fetch them)
      const childUpdate: YamlParseResult['childrenToUpdate'][0] = {
        id: matchedChild.id,
        updates,
      };

      // Note: Grandchildren will need to be fetched and processed by the caller
      if (yamlChild.children && yamlChild.children.length > 0) {
        childUpdate.children = yamlChild.children.map((grandchild) => ({
          task: {
            text: grandchild.text,
            internalState: (grandchild.state as BaseState) || BaseState.NOT_STARTED,
            dueDate: grandchild.dueDate,
          },
          children: grandchild.children
            ? convertYamlChildrenToCreateFormat(grandchild.children)
            : undefined,
        }));
      }

      toUpdate.push(childUpdate);
    } else {
      // Create new child
      const newChild: YamlParseResult['childrenToCreate'][0] = {
        task: {
          text: yamlChild.text,
          internalState: (yamlChild.state as BaseState) || BaseState.NOT_STARTED,
          dueDate: yamlChild.dueDate,
        },
      };

      if (yamlChild.children && yamlChild.children.length > 0) {
        newChild.children = convertYamlChildrenToCreateFormat(yamlChild.children);
      }

      toCreate.push(newChild);
    }
  }

  // Any existing children not matched should be deleted
  const toDelete = Array.from(existingChildrenMap.keys()).filter(
    (id) => !matchedIds.has(id)
  );

  return { toCreate, toUpdate, toDelete };
}

/**
 * Helper to recursively convert YAML children to the create format
 */
function convertYamlChildrenToCreateFormat(
  yamlChildren: YamlTask[]
): YamlParseResult['childrenToCreate'] {
  return yamlChildren.map((child) => ({
    task: {
      text: child.text,
      internalState: (child.state as BaseState) || BaseState.NOT_STARTED,
      dueDate: child.dueDate,
    },
    children: child.children
      ? convertYamlChildrenToCreateFormat(child.children)
      : undefined,
  }));
}
