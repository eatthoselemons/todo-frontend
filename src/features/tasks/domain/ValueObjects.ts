/**
 * Value Objects - Pure Composition (No Inheritance)
 * Following functional programming: composition over inheritance
 * Eliminates primitive obsession (Grokking Simplicity principle)
 */

import { Schema } from "effect";

/**
 * TaskId - Branded UUID type
 * Pure composition using pipe - no inheritance!
 */
export const TaskIdSchema = Schema.String.pipe(
  Schema.pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  Schema.brand("TaskId")
);

export type TaskId = Schema.Schema.Type<typeof TaskIdSchema>;

// Validated constructor - throws if invalid
export const makeTaskId = Schema.decodeUnknownSync(TaskIdSchema);

// Unsafe constructor for constants (no validation)
export const unsafeTaskId = (s: string): TaskId => s as TaskId;

export const ROOT_TASK_ID: TaskId = unsafeTaskId("db62a329-39d4-44b1-816c-5eb5c2e30a27");

/**
 * TaskText - Branded string with validation
 * Cannot be empty, max 500 chars
 */
export const TaskTextSchema = Schema.String.pipe(
  Schema.minLength(1),
  Schema.maxLength(500),
  Schema.brand("TaskText")
);

export type TaskText = Schema.Schema.Type<typeof TaskTextSchema>;

// Validated constructor
export const makeTaskText = Schema.decodeUnknownSync(TaskTextSchema);

/**
 * TaskPath - Branded array of TaskIds
 * Represents hierarchy: [ROOT, parent, grandparent, ..., this task]
 * Composed from TaskIdSchema
 */
export const TaskPathSchema = Schema.Array(TaskIdSchema).pipe(
  Schema.brand("TaskPath")
);

export type TaskPath = Schema.Schema.Type<typeof TaskPathSchema>;

// Validated constructor
export const makeTaskPath = Schema.decodeUnknownSync(TaskPathSchema);

/**
 * Timestamp - Branded non-negative integer (milliseconds)
 */
export const TimestampSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
  Schema.brand("Timestamp")
);

export type Timestamp = Schema.Schema.Type<typeof TimestampSchema>;

// Helper that validates
export const makeTimestamp = (ms?: number): Timestamp => {
  const value = ms ?? Date.now();
  return Schema.decodeUnknownSync(TimestampSchema)(value);
};

/**
 * DueDate - Branded ISO date string (YYYY-MM-DD)
 */
export const DueDateSchema = Schema.String.pipe(
  Schema.pattern(/^\d{4}-\d{2}-\d{2}$/),
  Schema.brand("DueDate")
);

export type DueDate = Schema.Schema.Type<typeof DueDateSchema>;

// Validated constructor
export const makeDueDate = Schema.decodeUnknownSync(DueDateSchema);
