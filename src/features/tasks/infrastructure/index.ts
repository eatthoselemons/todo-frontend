/**
 * Infrastructure Layer - Database & I/O
 */

// Errors
export {
  NotFoundError,
  DbError,
  ValidationError,
  ConflictError,
  ConstraintViolationError,
  type DatabaseError,
} from "./errors";

// Repository
export {
  type TaskRepository,
  TaskRepository as TaskRepositoryTag,
} from "./TaskRepository";

// PouchDB Implementation
export {
  PouchDBTaskRepository,
  PouchDBTaskRepositoryLive,
} from "./PouchDBAdapter";
