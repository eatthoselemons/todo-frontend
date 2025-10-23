/**
 * YAML Converter - Pure functions for task import/export
 * Following Grokking Simplicity: Pure calculations, no side effects
 */

import { Effect, pipe } from "effect";
import * as yaml from "js-yaml";
import { Task } from "../domain/TaskEntity";
import type { TaskId } from "../domain/ValueObjects";
import { TaskState, NotStarted } from "../domain/TaskState";
import {
  YamlTask,
  YamlTaskSchema,
  YamlParseResult,
  YamlParseError,
  YamlValidationError,
  YamlChildOperation,
} from "./YamlSchema";

/**
 * EXPORT: Convert task tree to YAML string
 * Pure function - no side effects
 */
export const exportTaskToYaml = (
  task: Task,
  childrenMap: Map<TaskId, Task[]>
): string => {
  const yamlTask = convertTaskToYamlObject(task, childrenMap);
  return yaml.dump(yamlTask, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });
};

/**
 * Recursively convert task and children to YAML object
 * Pure calculation
 */
const convertTaskToYamlObject = (
  task: Task,
  childrenMap: Map<TaskId, Task[]>
): any => {
  const yamlTask: any = {
    text: task.text,
  };

  // Only include state if not default (NotStarted)
  if (task.state._tag !== "NotStarted") {
    yamlTask.state = task.state;
  }

  // Only include dueDate if exists
  if (task.dueDate) {
    yamlTask.dueDate = task.dueDate;
  }

  // Convert children recursively
  const children = childrenMap.get(task.id) || [];
  if (children.length > 0) {
    yamlTask.children = children
      .sort((a, b) => {
        // Sort by creation time
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return aTime - bTime;
      })
      .map((child) => convertTaskToYamlObject(child, childrenMap));
  }

  return yamlTask;
};

/**
 * IMPORT: Parse YAML string to task structure
 * Returns Effect with proper error handling
 */
export const importTaskFromYaml = (
  yamlString: string,
  existingTask: Task,
  existingChildrenMap: Map<TaskId, Task>
): Effect.Effect<YamlParseResult, YamlParseError | YamlValidationError> =>
  pipe(
    parseYamlString(yamlString),
    Effect.flatMap((yamlTask) => validateYamlTask(yamlTask)),
    Effect.map((yamlTask) =>
      buildParseResult(yamlTask, existingTask, existingChildrenMap)
    )
  );

/**
 * Parse YAML string to object
 */
const parseYamlString = (
  yamlString: string
): Effect.Effect<unknown, YamlParseError> =>
  Effect.try({
    try: () => yaml.load(yamlString),
    catch: (error) =>
      new YamlParseError(
        error instanceof Error ? error.message : "Failed to parse YAML"
      ),
  });

/**
 * Validate YAML object against schema
 * Uses custom tagged errors, no generic Error throws
 */
const validateYamlTask = (
  data: unknown
): Effect.Effect<YamlTask, YamlValidationError> => {
  if (!data || typeof data !== "object") {
    return Effect.fail(new YamlValidationError("Invalid YAML: must be an object"));
  }
  
  const task = data as any;
  if (!task.text || typeof task.text !== "string") {
    return Effect.fail(
      new YamlValidationError("Invalid YAML: text field is required and must be a string")
    );
  }
  
  return Effect.succeed(task as YamlTask);
};

/**
 * Build parse result from validated YAML
 * Pure calculation
 */
const buildParseResult = (
  yamlTask: YamlTask,
  existingTask: Task,
  existingChildrenMap: Map<TaskId, Task>
): YamlParseResult => {
  // Parse root task updates
  const updatedTask = {
    text: yamlTask.text,
    state: yamlTask.state,
    dueDate: yamlTask.dueDate,
  };

  // Process children
  const childResult = processYamlChildren(
    yamlTask.children || [],
    existingChildrenMap
  );

  return {
    updatedTask,
    childrenToCreate: childResult.toCreate,
    childrenToUpdate: childResult.toUpdate,
    childrenToDelete: childResult.toDelete,
  };
};

/**
 * Process YAML children and determine create/update/delete operations
 * Pure calculation
 */
const processYamlChildren = (
  yamlChildren: any[],
  existingChildrenMap: Map<TaskId, Task>
): {
  toCreate: YamlChildOperation[];
  toUpdate: YamlChildOperation[];
  toDelete: TaskId[];
} => {
  const toCreate: YamlChildOperation[] = [];
  const toUpdate: YamlChildOperation[] = [];
  const matchedIds = new Set<TaskId>();

  // Match YAML children with existing by ID (preferred) or text (fallback)
  for (const yamlChild of yamlChildren) {
    let matchedChild: Task | undefined;

    // Try to match by ID first
    if (yamlChild.id && existingChildrenMap.has(yamlChild.id as TaskId)) {
      matchedChild = existingChildrenMap.get(yamlChild.id as TaskId);
      matchedIds.add(yamlChild.id as TaskId);
    } else {
      // Fallback: match by text
      for (const [id, existingChild] of existingChildrenMap) {
        if (existingChild.text === yamlChild.text && !matchedIds.has(id)) {
          matchedChild = existingChild;
          matchedIds.add(id);
          break;
        }
      }
    }

    if (matchedChild) {
      // Update existing child (includes id)
      toUpdate.push({
        id: matchedChild.id,
        text: yamlChild.text,
        state: yamlChild.state,
        dueDate: yamlChild.dueDate,
        children: yamlChild.children
          ? convertYamlChildrenToCreateFormat(yamlChild.children)
          : undefined,
      });
    } else {
      // Create new child (no id)
      toCreate.push({
        text: yamlChild.text,
        state: yamlChild.state,
        dueDate: yamlChild.dueDate,
        children: yamlChild.children
          ? convertYamlChildrenToCreateFormat(yamlChild.children)
          : undefined,
      });
    }
  }

  // Delete unmatched existing children
  const toDelete = Array.from(existingChildrenMap.keys()).filter(
    (id) => !matchedIds.has(id)
  );

  return { toCreate, toUpdate, toDelete };
};

/**
 * Recursively convert YAML children to operation format
 * Pure calculation
 */
const convertYamlChildrenToCreateFormat = (
  yamlChildren: any[]
): YamlChildOperation[] => {
  return yamlChildren.map((child) => ({
    text: child.text,
    state: child.state,
    dueDate: child.dueDate,
    children: child.children
      ? convertYamlChildrenToCreateFormat(child.children)
      : undefined,
  }));
};
