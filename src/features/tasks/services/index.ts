/**
 * Service Layer - Business Logic & Orchestration
 * Combines Repository (I/O) + Calculations (pure logic)
 */

import { Layer } from "effect";

// Query Service
export { TaskQueryService } from "./TaskQueryService";

// Command Service
export { TaskCommandService } from "./TaskCommandService";

/**
 * Complete service layer (both query and command services)
 * Note: Requires TaskRepository to be provided
 *
 * Usage:
 *   const AppLive = Layer.mergeAll(
 *     PouchDBTaskRepositoryLive(db),
 *     TaskServicesLive
 *   );
 *
 *   const program = Effect.gen(function* () {
 *     const queries = yield* TaskQueryService;
 *     const tasks = yield* queries.getAllTasks();
 *     return tasks;
 *   });
 *
 *   Effect.runPromise(program.pipe(Effect.provide(AppLive)));
 */
import { TaskQueryService } from "./TaskQueryService";
import { TaskCommandService } from "./TaskCommandService";

export const TaskServicesLive = Layer.mergeAll(
  TaskQueryService.Default,
  TaskCommandService.Default
);
