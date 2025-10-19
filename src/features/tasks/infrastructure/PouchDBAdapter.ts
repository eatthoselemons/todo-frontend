/**
 * PouchDB Adapter - Implements TaskRepository with PouchDB
 * Following Effect patterns for side effects
 */

import { Effect, Stream, Layer } from "effect";
import PouchDB from "pouchdb";
import { Task, TaskId, ROOT_TASK_ID, toLegacy, fromLegacy, LegacyTask } from "../domain";
import { TaskRepository } from "./TaskRepository";
import { NotFoundError, DbError } from "./errors";
import { isImmediateChildOf } from "../calculations";

/**
 * PouchDB implementation of TaskRepository
 */
export class PouchDBTaskRepository implements TaskRepository {
  constructor(private readonly db: PouchDB.Database<LegacyTask>) {}

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
   */
  getAll(): Effect.Effect<ReadonlyArray<Task>, DbError> {
    return Effect.tryPromise({
      try: () => this.db.allDocs({ include_docs: true }),
      catch: (error) => DbError.make(error, "getAll"),
    }).pipe(
      Effect.map((result) =>
        result.rows
          .filter((row: any) => row.doc && row.doc.type === "task")
          .map((row: any) => fromLegacy(row.doc as LegacyTask))
          .filter((task) => task.id !== ROOT_TASK_ID)
      )
    );
  }

  /**
   * Get immediate children of a parent
   */
  getImmediateChildren(parentId: TaskId): Effect.Effect<ReadonlyArray<Task>, DbError> {
    return this.getAll().pipe(
      Effect.map((allTasks) =>
        allTasks.filter((task) => isImmediateChildOf(task, parentId))
      )
    );
  }

  /**
   * Get root-level tasks
   */
  getRootTasks(): Effect.Effect<ReadonlyArray<Task>, DbError> {
    return this.ensureRootExists().pipe(
      Effect.flatMap(() => this.getAll()),
      Effect.map((allTasks) =>
        allTasks.filter((task) => isImmediateChildOf(task, ROOT_TASK_ID))
      )
    );
  }

  /**
   * Get all descendants of a task
   */
  getDescendants(
    ancestorId: TaskId
  ): Effect.Effect<ReadonlyArray<Task>, DbError> {
    return this.getAll().pipe(
      Effect.map((allTasks) =>
        allTasks.filter(
          (task) => task.path.includes(ancestorId) && task.id !== ancestorId
        )
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

  /**
   * Private: Ensure root task exists
   */
  private ensureRootExists(): Effect.Effect<void, DbError> {
    return this.exists(ROOT_TASK_ID).pipe(
      Effect.flatMap((exists) => {
        if (exists) {
          return Effect.void;
        }

        const rootTask: LegacyTask = {
          _id: ROOT_TASK_ID,
          type: "task",
          text: "root",
          internalState: "not_started",
          id: ROOT_TASK_ID,
          path: [ROOT_TASK_ID],
          changeLog: [],
        };

        return Effect.tryPromise({
          try: () => this.db.put(rootTask),
          catch: (error) => DbError.make(error, "ensureRootExists"),
        }).pipe(Effect.asVoid);
      })
    );
  }
}

/**
 * Create Layer for dependency injection
 */
export const PouchDBTaskRepositoryLive = (db: PouchDB.Database<LegacyTask>) =>
  Layer.succeed(TaskRepository, new PouchDBTaskRepository(db));
