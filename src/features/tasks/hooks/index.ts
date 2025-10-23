/**
 * Task Hooks - React integration with Effect services
 * 
 * Phase 4: Hooks Refactoring
 */

// Core hooks
export { useTaskServices, runTask, runTaskSafe } from "./useTaskServices";
export { useTaskQueries } from "./useTaskQueries";
export { useTaskCommands } from "./useTaskCommands";
export { useTaskOperations } from "./useTaskOperations";

// Default export for drop-in replacement
export { default } from "./useTaskOperations";
