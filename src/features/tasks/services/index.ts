/**
 * Service Layer - Business Logic & Orchestration
 * Combines Repository (I/O) + Calculations (pure logic)
 */

import { Layer, pipe } from "effect";

// Query Service
export {
  type TaskQueryService,
  TaskQueryService as TaskQueryServiceTag,
  TaskQueryServiceLive,
} from "./TaskQueryService";

// Command Service  
export {
  type TaskCommandService,
  TaskCommandService as TaskCommandServiceTag,
  TaskCommandServiceLive,
} from "./TaskCommandService";

/**
 * Complete service layer (both query and command services)
 * Note: Requires TaskRepository to be provided
 */
import { TaskQueryService, TaskQueryServiceLive } from "./TaskQueryService";
import { TaskCommandService, TaskCommandServiceLive } from "./TaskCommandService";

export const TaskServicesLive = pipe(
  Layer.effect(TaskQueryService, TaskQueryServiceLive),
  Layer.merge(Layer.effect(TaskCommandService, TaskCommandServiceLive))
);
