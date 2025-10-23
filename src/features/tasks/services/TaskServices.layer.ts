/**
 * Task Services Layer
 * Following Neo4j.layer.ts pattern
 */

import { Effect, Layer } from "effect";
import { TaskRepository } from "../infrastructure/TaskRepository";
import { TaskCommandService, make as makeCommandService } from "./TaskCommandService";
import { TaskQueryService, make as makeQueryService } from "./TaskQueryService";

/**
 * Live layer for TaskCommandService
 * Depends on TaskRepository
 */
export const TaskCommandServiceLive = Layer.effect(
  TaskCommandService,
  Effect.gen(function* () {
    const repo = yield* TaskRepository;
    return makeCommandService(repo);
  })
);

/**
 * Live layer for TaskQueryService
 * Depends on TaskRepository
 */
export const TaskQueryServiceLive = Layer.effect(
  TaskQueryService,
  Effect.gen(function* () {
    const repo = yield* TaskRepository;
    return makeQueryService(repo);
  })
);

/**
 * Combined layer that provides both services
 */
export const TaskServicesLive = Layer.merge(
  TaskCommandServiceLive,
  TaskQueryServiceLive
);
