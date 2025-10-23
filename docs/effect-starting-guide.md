# Effect-TS Starting Guide
## Architectural Patterns & Best Practices

This guide captures all the lessons learned and best practices from refactoring this application to use Effect-TS, Domain-Driven Design, and Grokking Simplicity principles.

---

## Table of Contents

1. [Core Principles](#core-principles)
2. [Service Pattern](#service-pattern)
3. [Repository Pattern](#repository-pattern)
4. [Layer Architecture](#layer-architecture)
5. [React Integration](#react-integration)
6. [Domain Modeling](#domain-modeling)
7. [Efficient Hierarchical Data](#efficient-hierarchical-data)
8. [Common Pitfalls](#common-pitfalls)
9. [Testing Strategy](#testing-strategy)

---

## Core Principles

### 1. Composition Over Inheritance

**DO:** Use `const` + `pipe` for domain types
```typescript
// ✅ CORRECT - Domain types use composition
export const TaskIdSchema = Schema.String.pipe(
  Schema.pattern(/^[uuid]$/),
  Schema.brand("TaskId")
);
export type TaskId = Schema.Schema.Type<typeof TaskIdSchema>;
```

**DON'T:** Use `class extends` for domain types
```typescript
// ❌ WRONG - Don't extend for domain types
export class TaskIdSchema extends Schema.String.pipe(...) {}
```

**EXCEPTION:** Effect core types CAN use extends
```typescript
// ✅ OK - Effect's Data.TaggedError can be extended
export class MyError extends Data.TaggedError("MyError")<{
  message: string;
}> {}
```

### 2. No `this` - Ever

Services should use functional composition, not OOP classes with `this`.

**DON'T:**
```typescript
// ❌ WRONG
export class TaskCommandServiceImpl {
  constructor(private readonly repo: TaskRepository) {}
  
  createTask() {
    return this.repo.save(...);  // Using 'this'
  }
}
```

**DO:**
```typescript
// ✅ CORRECT - Close over dependencies from Context
export class TaskCommandService extends Effect.Service<TaskCommandService>()(
  "TaskCommandService",
  {
    effect: Effect.gen(function* () {
      const repo = yield* TaskRepository;  // No 'this'
      
      const createTask = (params) =>
        pipe(
          repo.getById(params.parentId),
          Effect.flatMap((parent) => /* ... */)
        );
      
      return { createTask } as const;
    }),
    dependencies: [],
  }
) {}
```

### 3. No Void Returns on Operations That Can Error

**DON'T:**
```typescript
// ❌ WRONG - Can fail, but returns void
save(task: Task): Effect.Effect<void, DbError>
```

**DO:**
```typescript
// ✅ CORRECT - Returns Effect even if result is void
save(task: Task): Effect.Effect<void, DbError>  // Still Effect!
```

The key: wrap in `Effect` so errors are typed and handleable.

### 4. Schema-First Approach

Always define Schema first, then extract the type.

```typescript
// 1. Define Schema
export const TaskTextSchema = Schema.String.pipe(
  Schema.minLength(1),
  Schema.maxLength(500),
  Schema.brand("TaskText")
);

// 2. Extract type
export type TaskText = Schema.Schema.Type<typeof TaskTextSchema>;

// 3. Create constructor
export const makeTaskText = Schema.decodeUnknownSync(TaskTextSchema);

// 4. Optional: unsafe constructor for constants
export const unsafeTaskText = (v: string) => v as TaskText;
```

---

## Service Pattern

### Effect.Service Pattern (Official)

Use the official `Effect.Service` class pattern from the docs.

```typescript
import { Effect, Layer } from "effect";

export class TaskQueryService extends Effect.Service<TaskQueryService>()(
  "TaskQueryService",
  {
    effect: Effect.gen(function* () {
      // 1. Get dependencies from Context
      const repo = yield* TaskRepository;
      
      // 2. Define operations as const functions
      const getTask = (id: TaskId) => repo.getById(id);
      
      const getAllTasks = () => repo.getAll();
      
      const getTaskTree = (rootId: TaskId) =>
        pipe(
          repo.getAll(),
          Effect.map((tasks) => buildTaskTree(tasks, rootId)),
          Effect.flatMap((tree) =>
            tree
              ? Effect.succeed(tree)
              : Effect.fail(NotFoundError.make(rootId))
          )
        );
      
      // 3. Return service object as const
      return {
        getTask,
        getAllTasks,
        getTaskTree,
      } as const;
    }),
    dependencies: [],  // Can list dependencies for Layer.provideMerge
  }
) {
  // 4. Optional: Add Test layer
  static Test = this.Default.pipe(
    Layer.provide(InMemoryTaskRepositoryTest)
  );
}
```

**Key Points:**
- Use `Effect.gen` inside `effect` (this is the ONE place it's OK)
- Close over dependencies with `yield*`
- Return operations as `const` object
- `.Default` provides the live layer automatically
- `.Test` can provide mock layers

### Using Services

```typescript
// In application code
const program = Effect.gen(function* () {
  const queries = yield* TaskQueryService;
  const tasks = yield* queries.getAllTasks();
  return tasks;
});

// With proper layers
const AppLive = Layer.mergeAll(
  PouchDBRepositoryLive(db),
  TaskQueryService.Default,
  TaskCommandService.Default
);

Effect.runPromise(program.pipe(Effect.provide(AppLive)));
```

---

## Repository Pattern

### Separation: Repository vs Service

**Repository = Database Primitives Only**
```typescript
interface TaskRepository {
  // CRUD operations
  readonly getById: (id: TaskId) => Effect<Task, NotFoundError | DbError>;
  readonly getAll: () => Effect<ReadonlyArray<Task>, DbError>;
  readonly save: (task: Task) => Effect<void, DbError>;
  readonly delete: (id: TaskId) => Effect<void, NotFoundError | DbError>;
  
  // Database-level queries (using DB indexes/views)
  readonly getImmediateChildren: (parentId: TaskId) => Effect<ReadonlyArray<Task>, DbError>;
  readonly getDescendants: (ancestorId: TaskId) => Effect<ReadonlyArray<Task>, NotFoundError | DbError>;
}
```

**Service = Business Logic + Orchestration**
```typescript
class TaskCommandService {
  createTask(params) {
    // ✅ Business logic: ensure root exists
    return pipe(
      ensureRootExists(),
      Effect.flatMap(() => repo.getById(params.parentId)),
      Effect.catchTag("NotFoundError", () =>
        Effect.fail(new InvalidTaskTextError(`Parent not found`))
      ),
      Effect.flatMap((parent) => createTask({ ...params, parentPath: parent.path })),
      Effect.tap((task) => repo.save(task))
    );
  }
  
  deleteTask(id) {
    // ✅ Business rule: can't delete root
    if (id === ROOT_TASK_ID) {
      return Effect.fail(ConstraintViolationError.make(...));
    }
    
    // ✅ Orchestration: get descendants + delete all
    return pipe(
      repo.getAll(),
      Effect.flatMap((all) => {
        const descendants = getAllDescendants(all, id);
        return repo.deleteMany([id, ...descendants.map(d => d.id)]);
      })
    );
  }
}
```

**Rules:**
- ❌ **Repository**: No business logic, no validation, no orchestration
- ✅ **Repository**: Just DB queries (efficient, using indexes)
- ✅ **Service**: Business rules, validation, orchestration
- ✅ **Service**: Combines repository calls with domain calculations

---

## Layer Architecture

### Layer Composition

```typescript
// 1. Repository Layer (provides TaskRepository)
const PouchDBRepositoryLive = (db: PouchDB.Database) =>
  Layer.succeed(TaskRepository, new PouchDBTaskRepository(db));

// 2. Service Layer (depends on TaskRepository)
// Using Effect.Service creates .Default automatically
class TaskQueryService extends Effect.Service<TaskQueryService>()(
  "TaskQueryService",
  {
    effect: Effect.gen(function* () {
      const repo = yield* TaskRepository;
      // ...
      return { /* operations */ } as const;
    }),
    dependencies: [],
  }
) {}

// 3. Compose Layers
const AppLive = TaskServicesLive.pipe(
  Layer.provide(PouchDBRepositoryLive(db))
);

// Or with Layer.mergeAll
const AppLive = Layer.mergeAll(
  PouchDBRepositoryLive(db),
  TaskQueryService.Default,
  TaskCommandService.Default
);
```

**Key Pattern:**
```typescript
// Services depend on Repository
// Use Layer.provide to inject dependencies
ServiceLayer.pipe(Layer.provide(RepositoryLayer))
```

---

## React Integration

### ManagedRuntime for React

**DO:** Use `ManagedRuntime` with proper lifecycle
```typescript
import { ManagedRuntime, Layer, Effect } from "effect";

let runtime: ManagedRuntime.ManagedRuntime<Services, never> | null = null;

export const useTaskServices = () => {
  const { db } = useContext(...);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Build layer
    const repoLayer = PouchDBRepositoryLive(db);
    const AppLive = ServicesLive.pipe(Layer.provide(repoLayer));

    // Create managed runtime
    runtime = ManagedRuntime.make(AppLive);
    setIsReady(true);

    return () => {
      if (runtime) {
        runtime.dispose();  // Important: cleanup
      }
      runtime = null;
    };
  }, [db]);

  return { isReady };
};

// Helper to run Effects
export const runTask = <A, E>(
  effect: Effect.Effect<A, E, Services>
): Promise<A> => {
  if (!runtime) {
    return Promise.reject(new Error("Runtime not initialized"));
  }
  return runtime.runPromise(effect);
};
```

### Query Hook Pattern

```typescript
export const useTaskQueries = () => {
  const getTask = useCallback(
    async (id: TaskId): Promise<Task> => {
      return runTask(
        Effect.gen(function* () {
          const queries = yield* TaskQueryService;
          return yield* queries.getTask(id);
        })
      );
    },
    []
  );

  return { getTask, /* ... */ };
};
```

**Key Points:**
- `ManagedRuntime.make` for Effect execution
- Always call `runtime.dispose()` on cleanup
- Wrap Effect programs in async functions for React
- Check `isReady` before running operations

---

## Domain Modeling

### Discriminated Unions (Sum Types)

**DO:** Use discriminated unions for state
```typescript
export type TaskState =
  | { readonly _tag: "NotStarted" }
  | { readonly _tag: "InProgress" }
  | { readonly _tag: "Blocked"; readonly reason?: string }
  | { readonly _tag: "Done" };

// Constructors
export const NotStarted: TaskState = { _tag: "NotStarted" };
export const InProgress: TaskState = { _tag: "InProgress" };
export const Blocked = (reason?: string): TaskState => ({
  _tag: "Blocked",
  reason,
});
export const Done: TaskState = { _tag: "Done" };

// Pattern matching
const stateColor = (state: TaskState): string => {
  switch (state._tag) {
    case "NotStarted": return "gray";
    case "InProgress": return "blue";
    case "Blocked": return "red";
    case "Done": return "green";
  }
  // ✅ Compiler ensures exhaustiveness
};
```

**DON'T:** Use enums or string unions
```typescript
// ❌ WRONG - Can't carry different data per state
enum TaskState {
  NOT_STARTED = "not_started",
  IN_PROGRESS = "in_progress",
  DONE = "done"
}
```

### Immutability

**DO:** Always return new objects
```typescript
export const updateText = (task: Task, text: TaskText): Task => {
  return {
    ...task,
    text,
    updatedAt: makeTimestamp(),
  };
};
```

**DON'T:** Mutate
```typescript
// ❌ WRONG
export const updateText = (task: Task, text: TaskText): void => {
  task.text = text;  // Mutation!
};
```

---

## Efficient Hierarchical Data

### PouchDB/CouchDB Pattern

When storing tree/hierarchical data, use **path arrays** with **view queries**.

**Pattern from:** https://lethain.com/hierarchical-data-in-couchdb/

#### 1. Store Full Paths

```typescript
interface Task {
  id: TaskId;
  path: TaskPath;  // ["root", "parent", "child", "this-task"]
  text: string;
  // ...
}
```

#### 2. Create Views for Efficient Queries

```typescript
const DESIGN_DOC = {
  _id: "_design/tasks",
  views: {
    // Query descendants by path prefix
    by_full_path: {
      map: `function (doc) {
        if (doc.type === "task" && Array.isArray(doc.path)) {
          emit(doc.path, null);
        }
      }`,
    },
    // Query immediate children by parent
    by_parent: {
      map: `function (doc) {
        if (doc.type === "task" && Array.isArray(doc.path) && doc.path.length > 1) {
          var parentId = doc.path[doc.path.length - 2];
          emit(parentId, null);
        }
      }`,
    },
  },
};
```

#### 3. Query with startkey/endkey

```typescript
// Get all descendants of a node (DB-level, not in-memory!)
getDescendantsByPathPrefix(path: TaskPath) {
  const startkey = [...path, null];  // Excludes exact ancestor
  const endkey = [...path, {}];      // Upper bound for deeper paths
  
  return Effect.tryPromise({
    try: () =>
      this.db.query("tasks/by_full_path", {
        startkey,
        endkey,
        include_docs: true,
      }),
    catch: (error) => DbError.make(error, "getDescendants"),
  });
}

// Get immediate children (direct equality key)
getImmediateChildren(parentId: TaskId) {
  return Effect.tryPromise({
    try: () =>
      this.db.query("tasks/by_parent", {
        key: parentId,
        include_docs: true,
      }),
    catch: (error) => DbError.make(error, "getChildren"),
  });
}
```

**Benefits:**
- ✅ No `getAll()` + filter in memory
- ✅ DB does the work (indexed, fast)
- ✅ Scalable to large datasets
- ✅ Works with replication

---

## Common Pitfalls

### ❌ Pitfall 1: Using Effect.gen in Service Bodies

**DON'T:**
```typescript
// ❌ WRONG - Don't use Effect.gen in method bodies
class TaskService {
  getTask(id: TaskId) {
    return Effect.gen(function* (_) {
      const repo = yield* _(this.repo);  // Also using 'this'!
      return yield* _(repo.getById(id));
    });
  }
}
```

**DO:**
```typescript
// ✅ CORRECT - Use pipe
class TaskService extends Effect.Service<TaskService>()(
  "TaskService",
  {
    effect: Effect.gen(function* () {  // OK here in Layer definition
      const repo = yield* TaskRepository;
      
      const getTask = (id: TaskId) =>
        pipe(
          repo.getById(id),
          Effect.map((task) => transform(task))
        );
      
      return { getTask } as const;
    }),
  }
) {}
```

### ❌ Pitfall 2: Wrong Layer Composition

**DON'T:**
```typescript
// ❌ WRONG - Layer.mergeAll doesn't resolve dependencies
const AppLive = Layer.mergeAll(
  ServiceLayer,  // Depends on RepositoryLayer
  RepositoryLayer
);
```

**DO:**
```typescript
// ✅ CORRECT - Use Layer.provide
const AppLive = ServiceLayer.pipe(
  Layer.provide(RepositoryLayer)
);
```

### ❌ Pitfall 3: In-Memory Filtering Instead of DB Queries

**DON'T:**
```typescript
// ❌ WRONG - Gets ALL docs then filters in memory
getImmediateChildren(parentId) {
  return pipe(
    this.db.allDocs({ include_docs: true }),
    Effect.map((result) =>
      result.rows
        .filter(row => isChild(row.doc, parentId))  // In-memory!
    )
  );
}
```

**DO:**
```typescript
// ✅ CORRECT - Use DB view
getImmediateChildren(parentId) {
  return Effect.tryPromise({
    try: () =>
      this.db.query("tasks/by_parent", {
        key: parentId,  // DB-level filtering
        include_docs: true,
      }),
  });
}
```

### ❌ Pitfall 4: Business Logic in Repository

**DON'T:**
```typescript
// ❌ WRONG - Repository has business rules
class Repository {
  deleteTask(id) {
    if (id === ROOT_TASK_ID) {  // Business rule!
      throw new Error("Can't delete root");
    }
    return this.db.remove(id);
  }
}
```

**DO:**
```typescript
// ✅ CORRECT - Business rules in Service
class Repository {
  delete(id) {
    return Effect.tryPromise({
      try: () => this.db.remove(id),
      catch: (e) => DbError.make(e),
    });
  }
}

class Service {
  deleteTask(id) {
    // Business rule here
    if (id === ROOT_TASK_ID) {
      return Effect.fail(ConstraintViolationError.make(...));
    }
    return repo.delete(id);
  }
}
```

---

## Testing Strategy

### Domain & Calculations

Pure functions = no mocks needed!

```typescript
import { isTaskOverdue } from "./TaskCalculations";

test("task is overdue when due date passed", () => {
  const task = {
    id: "task-1",
    text: "Test",
    dueDate: makeDueDate("2024-01-01"),
    state: NotStarted,
    // ...
  };
  
  expect(isTaskOverdue(task, makeDueDate("2024-12-31"))).toBe(true);
});
```

### Services

Mock at repository boundary.

```typescript
const mockRepo: TaskRepository = {
  getAll: () => Effect.succeed([mockTask1, mockTask2]),
  getById: (id) => Effect.succeed(mockTask1),
  save: () => Effect.void,
  delete: () => Effect.void,
  // ...
};

// Test with mock using Layer.succeed
const TestLayer = Layer.succeed(TaskRepository, mockRepo);

test("gets overdue tasks", async () => {
  const program = Effect.gen(function* () {
    const service = yield* TaskQueryService;
    return yield* service.getOverdueTasks(makeDueDate("2024-12-31"));
  });
  
  const result = await Effect.runPromise(
    program.pipe(Effect.provide(TestLayer))
  );
  
  expect(result.length).toBe(1);
});
```

### Infrastructure

Use in-memory implementations.

```typescript
const InMemoryRepositoryTest = Layer.effect(
  TaskRepository,
  Effect.gen(function* () {
    const store = new Map<TaskId, Task>();
    
    const repo: TaskRepository = {
      getById: (id) =>
        Effect.sync(() => {
          const task = store.get(id);
          if (!task) throw NotFoundError.make(id);
          return task;
        }),
      save: (task) => Effect.sync(() => void store.set(task.id, task)),
      // ...
    };
    
    return repo;
  })
);
```

---

## Quick Reference

### Project Structure

```
src/features/tasks/
├── domain/              # Branded types, entities, events
│   ├── ValueObjects.ts  # TaskId, TaskText, TaskPath, etc.
│   ├── TaskEntity.ts    # Task entity + constructors
│   ├── TaskState.ts     # Discriminated union for state
│   └── index.ts
├── calculations/        # Pure functions (no I/O)
│   ├── TaskCalculations.ts
│   ├── PathCalculations.ts
│   ├── TreeCalculations.ts
│   └── index.ts
├── infrastructure/      # Database layer
│   ├── errors.ts        # NotFoundError, DbError, etc.
│   ├── TaskRepository.ts  # Interface
│   ├── PouchDBAdapter.ts  # Implementation with views
│   └── index.ts
├── services/           # Business logic + orchestration
│   ├── TaskQueryService.ts   # Read operations
│   ├── TaskCommandService.ts # Write operations
│   └── index.ts
└── hooks/              # React integration
    ├── useTaskServices.ts    # ManagedRuntime
    ├── useTaskQueries.ts     # Query operations
    ├── useTaskCommands.ts    # Command operations
    ├── useTaskOperations.ts  # Combined
    └── index.ts
```

### Layer Dependency Flow

```
UI Components
  ↓
Hooks (React bridge)
  ↓
Services (Business logic)
  ↓
Repository (DB interface)
  ↓
Adapter (DB implementation)
```

### Checklist for New Effect Project

- [ ] Define domain types with Schema-first
- [ ] Use discriminated unions for state
- [ ] Extract pure calculations (pass time as param)
- [ ] Create Repository interface (DB primitives only)
- [ ] Implement Adapter with efficient queries
- [ ] Create Services with Effect.Service pattern
- [ ] Use ManagedRuntime for React integration
- [ ] Create query/command hooks
- [ ] Test: mock at repository boundary
- [ ] No `this`, no `void` on error-prone ops, no `Effect.gen` in bodies

---

## Additional Resources

- Effect Docs: https://effect.website/docs
- Layer Management: https://effect.website/docs/requirements-management/layers
- Service Pattern: https://effect.website/docs/requirements-management/services
- Hierarchical Data in CouchDB: https://lethain.com/hierarchical-data-in-couchdb/
- Domain Modeling Made Functional: Scott Wlaschin
- Grokking Simplicity: Eric Normand

---

**Last Updated:** After Phase 4 completion
**Status:** Production-ready patterns
