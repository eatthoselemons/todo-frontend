/**
 * Service Layer - Business Logic & Orchestration
 * Combines Repository (I/O) + Calculations (pure logic)
 */

// Query Service
export { TaskQueryService, make as makeQueryService } from "./TaskQueryService";

// Command Service
export { TaskCommandService, make as makeCommandService } from "./TaskCommandService";

// Layers
export {
  TaskServicesLive,
  TaskCommandServiceLive,
  TaskQueryServiceLive,
} from "./TaskServices.layer";
