/**
 * PouchDB Adapter - Implements TaskRepository with PouchDB
 * Following Effect patterns for side effects
 * 
 * Uses efficient hierarchical queries with PouchDB views:
 * - tasks/by_full_path: Range queries for descendants
 * - tasks/by_parent: Direct queries for immediate children
 */

import { Effect, Stream, Layer } from "effect";
import PouchDB from "pouchdb";
import { Task, TaskId, ROOT_TASK_ID, toLegacy, fromLegacy, LegacyTask } from "../domain";
import { TaskRepository } from "./TaskRepository";
import { NotFoundError, DbError } from "./errors";

/**
 * Design document for efficient hierarchical queries
 * Following the path-based pattern from CouchDB best practices
 */
const TASKS_DDOC = {
  _id: "_design/tasks",
  views: {
    // Query by full path array - enables efficient descendants queries
    // Using startkey/endkey range on path arrays
    by_full_path: {
      map: `function (doc) {
        if (doc.type === "task" && Array.isArray(doc.path)) {
          emit(doc.path, null);
        }
      }`,
    },
    // Query by parent ID - enables efficient immediate children queries
    by_parent: {
      map: `function (doc) {
        if (doc.type === "task" && Array.isArray(doc.path) && doc.path.length > 1) {
          var parentId = doc.path[doc.path.length - 2];
          emit(parentId, null);
        }
      }`,
    },
    // Query by type - speeds up getAll without in-memory filtering
    by_type: {
      map: `function (doc) {
        if (doc.type) {
          emit(doc.type, null);
        }
      }`,
    },
  },
};

/**
 * PouchDB implementation of TaskRepository
 */
export class PouchDBTaskRepository implements TaskRepository {
  constructor(private readonly db: PouchDB.Database<LegacyTask>) {}

  /**
   * Ensure views are created in the database
   * Idempotent - safe to call multiple times
   */
  private ensureViews(): Effect.Effect<void, DbError> {
    return Effect.tryPromise({
      try: async () => {
        try {
          const ddoc: any = await this.db.get(TASKS_DDOC._id);
          const next = { ...ddoc, views: TASKS_DDOC.views };
          if (JSON.stringify(ddoc.views) !== JSON.stringify(TASKS_DDOC.views)) {
            await this.db.put(next);
          }
        } catch (e: any) {
          if (e.status === 404) {
            await this.db.put(TASKS_DDOC as any);
          } else {
            throw e;
          }
        }
      },
      catch: (error) => DbError.make(error, "ensureViews"),
    }).pipe(Effect.asVoid);
  }

  /**
   * Get task by ID
   */
  getById(id: TaskId): Effect.Effect<Task, NotFoundError | DbError> {
    return Effect.tryPromise({
      try: () => this.db.get(id),
      catch: (error: any) => {
        if (error.status === 404 || error.name === "not_found") {
          return NotFoundError.make(id);
        }
        return DbError.make(error, "getById");
      },
    }).pipe(Effect.map((doc) => fromLegacy(doc)));
  }

  /**
   * Get all tasks (excluding root)
   * Uses the by_type view for efficient filtering
   */
  getAll(): Effect.Effect<ReadonlyArray<Task>, DbError> {
    return this.ensureViews().pipe(
      Effect.flatMap(() =>
        Effect.tryPromise({
          try: () =>
            this.db.query("tasks/by_type", {
              key: "task",
              include_docs: true,
            }),
          catch: (error) => DbError.make(error, "getAll"),
        })
      ),
      Effect.map((result) =>
        result.rows
          .filter((row: any) => row.doc && row.doc._id !== ROOT_TASK_ID)
          .map((row: any) => fromLegacy(row.doc as LegacyTask))
      )
    );
  }

  /**
   * Get immediate children of a parent
   * Uses the by_parent view for efficient DB-level filtering
   */
  getImmediateChildren(
    parentId: TaskId
  ): Effect.Effect<ReadonlyArray<Task>, DbError> {
    return this.ensureViews().pipe(
      Effect.flatMap(() =>
        Effect.tryPromise({
          try: () =>
            this.db.query("tasks/by_parent", {
              key: parentId,
              include_docs: true,
            }),
          catch: (error) => DbError.make(error, "getImmediateChildren"),
        })
      ),
      Effect.map((result) =>
        result.rows
          .filter((row: any) => row.doc && row.doc.type === "task")
          .map((row: any) => fromLegacy(row.doc as LegacyTask))
      )
    );
  }

  /**
   * Get root-level tasks
   * Pure DB query - business logic (ensuring root exists) moved to Service layer
   */
  getRootTasks(): Effect.Effect<ReadonlyArray<Task>, DbError> {
    return this.getImmediateChildren(ROOT_TASK_ID);
  }

  /**
   * Get all descendants of a task
   * Uses efficient DB-level range query on path arrays
   * Following the CouchDB hierarchical data pattern with startkey/endkey
   */
  getDescendants(
    ancestorId: TaskId
  ): Effect.Effect<ReadonlyArray<Task>, NotFoundError | DbError> {
    return Effect.flatMap(this.getById(ancestorId), (ancestor) =>
      this.getDescendantsByPathPrefix(ancestor.path)
    );
  }

  /**
   * Get descendants by path prefix (internal helper for efficient queries)
   * Uses startkey/endkey range on path arrays to query at DB level
   */
  private getDescendantsByPathPrefix(
    path: ReadonlyArray<TaskId>
  ): Effect.Effect<ReadonlyArray<Task>, DbError> {
    // Range query pattern from CouchDB hierarchical data blog post:
    // startkey = path + [null] excludes the exact ancestor
    // endkey = path + [{}] is upper bound for any deeper path
    const startkey = [...path, null as any];
    const endkey = [...path, {} as any];

    return this.ensureViews().pipe(
      Effect.flatMap(() =>
        Effect.tryPromise({
          try: () =>
            this.db.query("tasks/by_full_path", {
              startkey,
              endkey,
              include_docs: true,
            }),
          catch: (error) => DbError.make(error, "getDescendantsByPathPrefix"),
        })
      ),
      Effect.map((result) =>
        result.rows
          .filter((row: any) => row.doc && row.doc.type === "task")
          .map((row: any) => fromLegacy(row.doc as LegacyTask))
      )
    );
  }

  /**
   * Save task (create or update)
   */
  save(task: Task): Effect.Effect<void, DbError> {
    const legacyTask = toLegacy(task);

    return Effect.tryPromise({
      try: () => this.db.get(task.id),
      catch: () => null as any,
    }).pipe(
      Effect.flatMap((existingDoc) => {
        const docToSave = existingDoc
          ? { ...existingDoc, ...legacyTask }
          : legacyTask;

        return Effect.tryPromise({
          try: () => this.db.put(docToSave),
          catch: (error) => DbError.make(error, "save"),
        });
      }),
      Effect.asVoid
    );
  }

  /**
   * Save multiple tasks
   */
  saveMany(tasks: ReadonlyArray<Task>): Effect.Effect<void, DbError> {
    return Effect.forEach(tasks, (task) =>
      Effect.tryPromise({
        try: () => this.db.get(task.id),
        catch: () => null as any,
      })
    ).pipe(
      Effect.flatMap((existingDocs) => {
        const docsToSave = tasks.map((task, index) => {
          const legacyTask = toLegacy(task);
          const existingDoc = existingDocs[index];
          return existingDoc ? { ...existingDoc, ...legacyTask } : legacyTask;
        });

        return Effect.tryPromise({
          try: () => this.db.bulkDocs(docsToSave),
          catch: (error) => DbError.make(error, "saveMany"),
        });
      }),
      Effect.asVoid
    );
  }

  /**
   * Delete task
   */
  delete(id: TaskId): Effect.Effect<void, NotFoundError | DbError> {
    return Effect.tryPromise({
      try: () => this.db.get(id),
      catch: (error: any) => {
        if (error.status === 404 || error.name === "not_found") {
          return NotFoundError.make(id);
        }
        return DbError.make(error, "delete");
      },
    }).pipe(
      Effect.flatMap((doc) =>
        Effect.tryPromise({
          try: () => this.db.remove(doc),
          catch: (error) => DbError.make(error, "delete"),
        })
      ),
      Effect.asVoid
    );
  }

  /**
   * Delete multiple tasks
   */
  deleteMany(ids: ReadonlyArray<TaskId>): Effect.Effect<void, DbError> {
    return Effect.forEach(ids, (id) =>
      Effect.tryPromise({
        try: () => this.db.get(id),
        catch: () => null as any,
      })
    ).pipe(
      Effect.flatMap((docs) => {
        const validDocs = docs
          .filter((doc: any): doc is LegacyTask => doc !== null)
          .map((doc) => ({ ...doc, _deleted: true }));

        if (validDocs.length === 0) {
          return Effect.void;
        }

        return Effect.tryPromise({
          try: () => this.db.bulkDocs(validDocs),
          catch: (error) => DbError.make(error, "deleteMany"),
        }).pipe(Effect.asVoid);
      })
    );
  }

  /**
   * Check if task exists
   */
  exists(id: TaskId): Effect.Effect<boolean, DbError> {
    return Effect.tryPromise({
      try: () => this.db.get(id),
      catch: (error: any) => {
        if (error.status === 404 || error.name === "not_found") {
          return null;
        }
        return DbError.make(error, "exists");
      },
    }).pipe(Effect.map((result) => result !== null));
  }

  /**
   * Watch for changes to a specific task
   */
  watch(id: TaskId): Stream.Stream<Task, DbError> {
    return Stream.async<Task, DbError>((emit) => {
      const changes = this.db
        .changes({
          since: "now",
          live: true,
          include_docs: true,
          filter: (doc) => doc._id === id,
        })
        .on("change", (change) => {
          if (change.doc) {
            emit.single(fromLegacy(change.doc as LegacyTask));
          }
        })
        .on("error", (error) => {
          emit.fail(DbError.make(error, "watch"));
        });

      return Effect.sync(() => {
        changes.cancel();
      });
    });
  }

  /**
   * Watch all task changes
   */
  watchAll(): Stream.Stream<Task, DbError> {
    return Stream.async<Task, DbError>((emit) => {
      const changes = this.db
        .changes({
          since: "now",
          live: true,
          include_docs: true,
          filter: (doc) => doc.type === "task",
        })
        .on("change", (change) => {
          if (change.doc) {
            emit.single(fromLegacy(change.doc as LegacyTask));
          }
        })
        .on("error", (error) => {
          emit.fail(DbError.make(error, "watchAll"));
        });

      return Effect.sync(() => {
        changes.cancel();
      });
    });
  }

}

/**
 * Create Layer for dependency injection
 */
export const PouchDBTaskRepositoryLive = (db: PouchDB.Database<LegacyTask>) =>
  Layer.succeed(TaskRepository, new PouchDBTaskRepository(db));
