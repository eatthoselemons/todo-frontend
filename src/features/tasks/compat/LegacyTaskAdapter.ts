/**
 * Legacy Task Adapter
 * Converts between old Task class (from /src/domain/Task) and new Task type (from domain/TaskEntity)
 * This enables incremental migration - components can keep using old Task while services use new Task
 */

import { Task as NewTask, toLegacy, fromLegacy, type LegacyTask } from "../domain/TaskEntity";
import { Task as OldTaskClass, type ITask as OldITask, BaseState, type TaskID } from "../../../domain/Task";

/**
 * Convert new domain Task to old Task class
 */
export const newToOldTask = (task: NewTask): OldTaskClass => {
  const legacy = toLegacy(task);
  
  // Map state string to BaseState enum
  const stateMap: Record<string, BaseState> = {
    not_started: BaseState.NOT_STARTED,
    in_progress: BaseState.IN_PROGRESS,
    blocked: BaseState.BLOCKED,
    done: BaseState.DONE,
  };
  
  const itask: OldITask = {
    text: legacy.text,
    internalState: stateMap[legacy.internalState] || BaseState.NOT_STARTED,
    id: legacy.id as TaskID,
    path: legacy.path as TaskID[],
    changeLog: legacy.changeLog,
    dueDate: legacy.dueDate,
  };
  
  return OldTaskClass.from(itask);
};

/**
 * Convert old Task to new domain Task
 */
export const oldToNewTask = (old: OldITask | OldTaskClass): NewTask => {
  // Handle both ITask and Task class
  const task = old instanceof OldTaskClass ? old : OldTaskClass.from(old);
  
  const wire: LegacyTask = {
    _id: task.id,
    type: "task",
    text: task.text,
    internalState: task.internalState,
    id: task.id,
    path: task.path,
    changeLog: task.changeLog,
    dueDate: task.dueDate,
  };
  
  return fromLegacy(wire);
};

/**
 * Convert TaskID (string) to branded TaskId
 * This is a type cast - at runtime they're the same
 */
export const toBrandedTaskId = (id: TaskID | string): any => {
  return id;
};

/**
 * Convert branded TaskId to TaskID (string)
 */
export const fromBrandedTaskId = (id: any): TaskID => {
  return id as TaskID;
};
