/**
 * React hook to access Task Services
 * Bridges Effect services to React world
 * 
 * Phase 4: Hooks Refactoring
 */

import { useEffect, useState } from "react";
import { Effect, Layer, Runtime, ManagedRuntime } from "effect";
import { useTaskContext } from "../context/TaskContext";
import { PouchDBTaskRepositoryLive } from "../infrastructure/PouchDBAdapter";
import { TaskServicesLive } from "../services";
import { TaskQueryService } from "../services/TaskQueryService";
import { TaskCommandService } from "../services/TaskCommandService";

/**
 * Runtime for Effect services
 * Created once per DB instance
 */
let serviceRuntime: ManagedRuntime.ManagedRuntime<TaskQueryService | TaskCommandService, never> | null = null;

/**
 * Hook to provide Task Services to React components
 * Automatically sets up the service layer with the PouchDB instance
 */
export const useTaskServices = () => {
  const { db } = useTaskContext();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Build the complete application layer
    // Repository layer provides TaskRepository
    const repoLayer = PouchDBTaskRepositoryLive(db as any);
    
    // Services layer depends on TaskRepository
    // Provide the repository to the services
    const AppLive = TaskServicesLive.pipe(Layer.provide(repoLayer));

    // Create managed runtime
    serviceRuntime = ManagedRuntime.make(AppLive);
    setIsReady(true);

    return () => {
      if (serviceRuntime) {
        serviceRuntime.dispose();
      }
      serviceRuntime = null;
      setIsReady(false);
    };
  }, [db]);

  return { isReady, runtime: serviceRuntime };
};

/**
 * Helper to run an Effect and return a Promise
 * Automatically uses the service runtime
 */
export const runTask = <A, E>(
  effect: Effect.Effect<A, E, TaskQueryService | TaskCommandService>
): Promise<A> => {
  if (!serviceRuntime) {
    return Promise.reject(new Error("Service runtime not initialized"));
  }

  return serviceRuntime.runPromise(effect);
};

/**
 * Helper to run an Effect with error handling
 * Returns [data, error] tuple (similar to Go style)
 */
export const runTaskSafe = async <A, E>(
  effect: Effect.Effect<A, E, TaskQueryService | TaskCommandService>
): Promise<[A | null, E | null]> => {
  try {
    const result = await runTask(effect);
    return [result, null];
  } catch (error) {
    return [null, error as E];
  }
};
