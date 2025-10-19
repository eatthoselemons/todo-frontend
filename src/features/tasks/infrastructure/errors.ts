/**
 * Database/Infrastructure Errors
 * Following Effect error handling patterns
 */

import { Data } from "effect";
import { TaskId } from "../domain";

/**
 * NotFoundError - Task not found in database
 */
export class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly taskId: TaskId;
  readonly message: string;
}> {
  static make(taskId: TaskId): NotFoundError {
    return new NotFoundError({
      taskId,
      message: `Task not found: ${taskId}`,
    });
  }
}

/**
 * DbError - Generic database error
 */
export class DbError extends Data.TaggedError("DbError")<{
  readonly cause: unknown;
  readonly message: string;
}> {
  static make(cause: unknown, context?: string): DbError {
    const message = context
      ? `Database error in ${context}: ${String(cause)}`
      : `Database error: ${String(cause)}`;

    return new DbError({
      cause,
      message,
    });
  }
}

/**
 * ValidationError - Data validation failed
 */
export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string;
  readonly value: unknown;
  readonly message: string;
}> {
  static make(field: string, value: unknown, reason: string): ValidationError {
    return new ValidationError({
      field,
      value,
      message: `Validation failed for ${field}: ${reason}`,
    });
  }
}

/**
 * ConflictError - Concurrent modification conflict
 */
export class ConflictError extends Data.TaggedError("ConflictError")<{
  readonly taskId: TaskId;
  readonly message: string;
}> {
  static make(taskId: TaskId): ConflictError {
    return new ConflictError({
      taskId,
      message: `Conflict: Task ${taskId} was modified by another process`,
    });
  }
}

/**
 * ConstraintViolationError - Business rule violation
 */
export class ConstraintViolationError extends Data.TaggedError(
  "ConstraintViolationError"
)<{
  readonly constraint: string;
  readonly message: string;
}> {
  static make(constraint: string, details: string): ConstraintViolationError {
    return new ConstraintViolationError({
      constraint,
      message: `Constraint violation: ${constraint} - ${details}`,
    });
  }
}

/**
 * Union of all database errors
 */
export type DatabaseError =
  | NotFoundError
  | DbError
  | ValidationError
  | ConflictError
  | ConstraintViolationError;
