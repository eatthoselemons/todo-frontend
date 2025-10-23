/**
 * Combined hook for Task operations
 * 
 * Phase 4: Hooks Refactoring - Complete replacement for useTaskHooks
 * Provides both queries and commands in a single hook
 */

import { useTaskServices } from "./useTaskServices";
import { useTaskQueries } from "./useTaskQueries";
import { useTaskCommands } from "./useTaskCommands";

/**
 * Complete task operations hook
 * Drop-in replacement for the old useTaskHooks
 * 
 * Usage:
 *   const tasks = useTaskOperations();
 *   
 *   // Queries
 *   const allTasks = await tasks.getAllTasks();
 *   const task = await tasks.getTask(id);
 *   
 *   // Commands
 *   await tasks.createTask({ text: "New task" });
 *   await tasks.deleteTask(id);
 */
export const useTaskOperations = () => {
  // Initialize service runtime
  const { isReady } = useTaskServices();

  // Get query operations
  const queries = useTaskQueries();

  // Get command operations
  const commands = useTaskCommands();

  return {
    // Service status
    isReady,

    // Spread all operations
    ...queries,
    ...commands,
  };
};

/**
 * Re-export for backward compatibility with old code
 * Components can import this instead of the old useTaskHooks
 */
export default useTaskOperations;
