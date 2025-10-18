/**
 * TaskState - Discriminated Union (Sum Type)
 * Following DDD: Make illegal states unrepresentable
 */

import { Schema } from "effect";

/**
 * Task can be in one of four states
 * Using discriminated union for type safety
 */
export type TaskState =
  | { readonly _tag: "NotStarted" }
  | { readonly _tag: "InProgress" }
  | { readonly _tag: "Blocked"; readonly reason?: string }
  | { readonly _tag: "Done" };

/**
 * State constructors
 */
export const NotStarted: TaskState = { _tag: "NotStarted" };
export const InProgress: TaskState = { _tag: "InProgress" };
export const Blocked = (reason?: string): TaskState => ({ 
  _tag: "Blocked", 
  reason 
});
export const Done: TaskState = { _tag: "Done" };

/**
 * Effect Schema for TaskState
 */
export const TaskStateSchema = Schema.Union(
  Schema.Struct({ _tag: Schema.Literal("NotStarted") }),
  Schema.Struct({ _tag: Schema.Literal("InProgress") }),
  Schema.Struct({ 
    _tag: Schema.Literal("Blocked"),
    reason: Schema.optional(Schema.String)
  }),
  Schema.Struct({ _tag: Schema.Literal("Done") })
);

/**
 * State ordering for progression
 */
const STATE_ORDER: ReadonlyArray<TaskState["_tag"]> = [
  "NotStarted",
  "InProgress", 
  "Blocked",
  "Done"
] as const;

/**
 * Calculations - Pure functions (no side effects)
 */

export const getNextState = (current: TaskState): TaskState => {
  const currentIndex = STATE_ORDER.indexOf(current._tag);
  const nextIndex = (currentIndex + 1) % STATE_ORDER.length;
  const nextTag = STATE_ORDER[nextIndex];
  
  switch (nextTag) {
    case "NotStarted": return NotStarted;
    case "InProgress": return InProgress;
    case "Blocked": return Blocked();
    case "Done": return Done;
  }
};

export const canTransitionTo = (
  from: TaskState,
  to: TaskState
): boolean => {
  // Can't transition to same state
  if (from._tag === to._tag) return false;
  
  // Can always transition from any state to NotStarted (reset)
  if (to._tag === "NotStarted") return true;
  
  // Can't go from Done to other states (except NotStarted which was handled above)
  if (from._tag === "Done") return false;
  
  // All other transitions are valid
  return true;
};

export const isCompleted = (state: TaskState): boolean => {
  return state._tag === "Done";
};

export const isBlocked = (state: TaskState): boolean => {
  return state._tag === "Blocked";
};

export const stateToString = (state: TaskState): string => {
  switch (state._tag) {
    case "NotStarted": return "not_started";
    case "InProgress": return "in_progress";
    case "Blocked": return state.reason ? `blocked: ${state.reason}` : "blocked";
    case "Done": return "done";
  }
};

/**
 * Parse legacy string state to new TaskState
 */
export const fromLegacyState = (legacy: string): TaskState => {
  const normalized = legacy.toLowerCase().replace(/_/g, "");
  
  switch (normalized) {
    case "notstarted":
      return NotStarted;
    case "inprogress":
      return InProgress;
    case "blocked":
      return Blocked();
    case "done":
      return Done;
    default:
      // Default to NotStarted for unknown states
      console.warn(`Unknown legacy state: ${legacy}, defaulting to NotStarted`);
      return NotStarted;
  }
};

/**
 * Convert to legacy format for backward compatibility
 */
export const toLegacyState = (state: TaskState): string => {
  switch (state._tag) {
    case "NotStarted": return "not_started";
    case "InProgress": return "in_progress";
    case "Blocked": return "blocked";
    case "Done": return "done";
  }
};
