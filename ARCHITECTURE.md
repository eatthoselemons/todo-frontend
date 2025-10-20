# Architecture & Design Principles

This document captures the architectural style and principles guiding this codebase refactoring.

## Philosophy

We're following **Domain-Driven Design** (Scott Wlaschin), **Grokking Simplicity** (Eric Normand), and **Effect-TS** functional programming to create a robust, maintainable, type-safe application.

## Core Principles

### 1. Composition Over Inheritance

**Always use composition with `pipe`, never use class inheritance.**

```typescript
// ✅ GOOD - Pure composition
export const TaskIdSchema = Schema.String.pipe(
  Schema.pattern(/^[uuid]$/),
  Schema.brand("TaskId")
);

export const TaskPathSchema = Schema.Array(TaskIdSchema).pipe(
  Schema.brand("TaskPath")
);

// ❌ BAD - Inheritance
export class TaskIdSchema extends Schema.String.pipe(...) {}
```

**Why:**
- Functional programming principle
- Easier to compose and extend
- No OOP complexity
- Follows Gang of Four patterns

### 2. Eliminate Primitive Obsession (Grokking Simplicity)

**Wrap ALL primitives in branded types using Effect.Schema.**

```typescript
// ❌ BAD - Primitive obsession
function updateTask(id: string, text: string) { ... }

// ✅ GOOD - Schema-first branded types
export const TaskIdSchema = Schema.String.pipe(
  Schema.pattern(/^[uuid]$/),
  Schema.brand("TaskId")
);
export type TaskId = Schema.Schema.Type<typeof TaskIdSchema>;
export const makeTaskId = Schema.decodeUnknownSync(TaskIdSchema);

function updateTask(id: TaskId, text: TaskText) { ... }
```

**Why:**
- Compiler prevents mixing types
- Validation at construction
- Self-documenting
- Single source of truth (Schema defines both type and validation)

### 3. Schema-First Approach (Effect Pattern)

**Always define Schema first, then derive the type.**

```typescript
// ✅ GOOD - Schema first
export const TaskTextSchema = Schema.String.pipe(
  Schema.minLength(1),
  Schema.maxLength(500),
  Schema.brand("TaskText")
);
export type TaskText = Schema.Schema.Type<typeof TaskTextSchema>;
export const makeTaskText = Schema.decodeUnknownSync(TaskTextSchema);

// ❌ BAD - Type first with separate validation
export type TaskText = string & Brand.Brand<"TaskText">;
export const TaskText = Brand.refined<TaskText>(...);
export const TaskTextSchema = Schema.String.pipe(...); // Duplicated!
```

**Pattern:**
1. Define `const XSchema = Schema.Y.pipe(...)`
2. Extract type: `type X = Schema.Schema.Type<typeof XSchema>`
3. Create constructor: `const makeX = Schema.decodeUnknownSync(XSchema)`
4. Optional unsafe: `const unsafeX = (v: Y) => v as X` (for constants only)

### 4. Make Illegal States Unrepresentable (DDD)

**Use discriminated unions (sum types), not enums or string unions.**

```typescript
// ❌ BAD - Any string, can't carry data
enum BaseState {
  NOT_STARTED = "not_started",
  IN_PROGRESS = "in_progress",
  BLOCKED = "blocked",
  DONE = "done"
}

// ✅ GOOD - Discriminated union, each variant can carry different data
export type TaskState =
  | { readonly _tag: "NotStarted" }
  | { readonly _tag: "InProgress" }
  | { readonly _tag: "Blocked"; readonly reason?: string }  // Can carry data!
  | { readonly _tag: "Done" };
```

**Why:**
- Each state can have different fields
- Pattern matching ensures exhaustiveness
- Impossible to create invalid states
- Better type inference

### 5. Immutability Everywhere (Grokking Simplicity)

**Never mutate. Always return new instances.**

```typescript
// ❌ BAD - Mutation
class Task {
  nextState(): void {
    this.internalState = nextState;  // Mutates!
    this.changeLog.push(...);        // Mutates!
  }
}

// ✅ GOOD - Immutable transformations
export const transitionState = (
  task: Task,
  newState: TaskState
): Effect<Task, InvalidStateTransitionError> => {
  return Effect.succeed({
    ...task,                                    // Copy
    state: newState,
    history: [...task.history, transition],    // New array
    updatedAt: makeTimestamp()
  });
};
```

**Why:**
- No accidental mutations
- Easy to reason about
- Enables undo/redo
- Time-travel debugging
- Thread-safe

### 6. Separate Calculations from Actions (Grokking Simplicity)

**Pure functions (calculations) vs side effects (actions).**

```typescript
// ✅ CALCULATION - Pure function (no side effects)
export const isTaskOverdue = (task: Task, currentDate: DueDate): boolean => {
  if (!task.dueDate) return false;
  if (isTaskCompleted(task)) return false;
  return task.dueDate < currentDate;
};

// ✅ ACTION - Side effect wrapped in Effect
export const getOverdueTasks = (date: DueDate): Effect<Task[], DbError> => {
  return pipe(
    repo.getAll(),  // Side effect: database I/O
    Effect.map(tasks => tasks.filter(t => isTaskOverdue(t, date)))  // Uses calculation!
  );
};

// ❌ BAD - Mixed calculation and action
export const isTaskOverdue = (task: Task): boolean => {
  const now = new Date();  // Side effect inside calculation!
  return task.dueDate < now;
};
```

**Rules:**
- **Calculations**: No I/O, no Date.now(), no Math.random(), no mutations
- **Actions**: Wrap in Effect, explicitly handle errors
- **Pass time as parameter** to keep calculations pure
- **Services** combine actions + calculations

### 7. Railway-Oriented Programming (Effect)

**Use Effect for error handling, not exceptions.**

```typescript
// ❌ BAD - Throws exceptions
function createTask(text: string): Task {
  if (!text) throw new Error("Text required");  // Hidden!
  return new Task(text);
}

// ✅ GOOD - Effect with typed errors
export const createTask = (params: {
  text: string;
}): Effect<Task, InvalidTaskTextError> => {
  return Effect.try({
    try: () => {
      const text = makeTaskText(params.text);  // Throws if invalid
      return { ...task, text };
    },
    catch: (error) => new InvalidTaskTextError(...)
  });
};
```

**Why:**
- Errors are part of the type signature
- Caller must handle errors explicitly
- Composable error handling
- No hidden exceptions

### 8. Pipe-Based Composition (Effect)

**Always use `pipe` for composing Effects, never `Effect.gen`.**

```typescript
// ✅ GOOD - Pipe composition
return pipe(
  repo.getById(id),
  Effect.flatMap((task) => updateText(task, newText)),
  Effect.tap((updated) => repo.save(updated))
);

// ❌ BAD - Effect.gen (causes implicit any errors)
return Effect.gen(function* (_) {
  const task = yield* _(repo.getById(id));
  const updated = yield* _(updateText(task, newText));
  yield* _(repo.save(updated));
  return updated;
});
```

**Patterns:**
- `Effect.map` - Transform success value (pure function)
- `Effect.flatMap` - Chain dependent effects
- `Effect.tap` - Side effect, keep original value
- `Effect.all` - Run multiple effects (parallel or sequential)
- `Effect.catchTag` - Handle specific error type
- `pipe` - Compose everything

### 9. Stratified Design (Grokking Simplicity)

**Clear layers, each depending only on layers below.**

```
┌──────────────────────────────────────────┐
│  UI Components (React)                   │  ← Phase 6 (future)
├──────────────────────────────────────────┤
│  Application Layer (Use Cases)           │  ← Phase 5 (future)
├──────────────────────────────────────────┤
│  Services (Orchestration)                │  ← Phase 3 ✅
│  - TaskQueryService, TaskCommandService  │
├──────────────────────────────────────────┤
│  Repository (Database I/O)               │  ← Phase 3 ✅
│  - TaskRepository, PouchDBAdapter        │
├──────────────────────────────────────────┤
│  Calculations (Pure Functions)           │  ← Phase 2 ✅
│  - Path, Task, Tree, Progress calcs     │
├──────────────────────────────────────────┤
│  Domain (Value Objects, Entities)        │  ← Phase 1 ✅
│  - TaskId, Task, TaskState, Events      │
└──────────────────────────────────────────┘
```

**Rules:**
- **Domain** has zero dependencies
- **Calculations** only depend on domain
- **Repository** only depends on domain
- **Services** depend on repository + calculations
- **UI** depends on services

### 10. Dependency Injection with Effect.Service

**Use Effect.Service class pattern for services.**

```typescript
// Define service using Effect.Service pattern
export class TaskQueryService extends Effect.Service<TaskQueryService>()(
  "TaskQueryService",
  {
    effect: Effect.gen(function* () {
      const repo = yield* TaskRepository;

      const getTask = (id: TaskId) => repo.getById(id);
      const getAllTasks = () => repo.getAll();

      return {
        getTask,
        getAllTasks,
      } as const;
    }),
    dependencies: [],
  }
) {
  // Optional: Add test layer
  static Test = this.Default.pipe(
    Layer.provide(InMemoryTaskRepositoryTest)
  );
}

// Use in application
const program = Effect.gen(function* () {
  const queries = yield* TaskQueryService;
  const tasks = yield* queries.getAllTasks();
  return tasks;
});

// Compose layers
const AppLive = Layer.mergeAll(
  PouchDBTaskRepositoryLive(db),
  TaskQueryService.Default,
  TaskCommandService.Default
);

Effect.runPromise(program.pipe(Effect.provide(AppLive)));
```

**Why:**
- Clean, official Effect pattern
- Automatic layer creation with `.Default`
- Easy test layers with `.Test`
- No manual Context.GenericTag needed
- Type-safe dependency injection

## Code Conventions

### File Naming

```
domain/
  ValueObjects.ts       # Branded primitives
  TaskState.ts          # State sum type
  TaskEntity.ts         # Main entity
  DomainEvents.ts       # Event definitions
  index.ts              # Public API

calculations/
  PathCalculations.ts   # Path operations
  TaskCalculations.ts   # Task operations
  TreeCalculations.ts   # Tree operations
  ProgressCalculations.ts  # Progress tracking
  index.ts              # Exports all

infrastructure/
  errors.ts             # Error types
  TaskRepository.ts     # Repository interface
  PouchDBAdapter.ts     # PouchDB implementation
  index.ts              # Infrastructure API

services/
  TaskQueryService.ts   # Read operations
  TaskCommandService.ts # Write operations
  index.ts              # Service API + Layers
```

### Naming Conventions

**Types:**
- Branded types: `TaskId`, `TaskText`, `TaskPath`
- Schemas: `TaskIdSchema`, `TaskTextSchema`
- Constructors: `makeTaskId`, `makeTaskText`
- Unsafe constructors: `unsafeTaskId` (for constants only)

**Functions:**
- Calculations: `isTaskOverdue`, `calculateProgress`
- Queries: `getTask`, `getAllTasks`, `searchTasks`
- Commands: `createTask`, `updateTask`, `deleteTask`
- Converters: `toLegacy`, `fromLegacy`

**Services:**
- Query service: `TaskQueryService`
- Command service: `TaskCommandService`
- Service tags: Same name as interface (Context.GenericTag handles it)

**Errors:**
- Domain errors: `InvalidTaskTextError`, `InvalidStateTransitionError`
- Infrastructure errors: `NotFoundError`, `DbError`, `ConstraintViolationError`

### Type Annotations

**Always extract types from Schema:**
```typescript
export const TaskIdSchema = Schema.String.pipe(...);
export type TaskId = Schema.Schema.Type<typeof TaskIdSchema>;
```

**Always annotate return types in complex flatMaps:**
```typescript
Effect.flatMap((data): Effect<void, SomeError> => {
  // Complex logic
  return someEffect;
})
```

### Import Order

```typescript
// 1. Effect libraries
import { Effect, Schema, pipe } from "effect";

// 2. Domain
import { Task, TaskId, TaskState } from "../domain";

// 3. Infrastructure
import { TaskRepository, NotFoundError } from "../infrastructure";

// 4. Calculations
import { isTaskOverdue, buildTaskTree } from "../calculations";

// 5. External libraries
import PouchDB from "pouchdb";
```

## Testing Strategy

### Domain & Calculations
**No mocks needed - pure data in, data out.**

```typescript
import { isTaskOverdue, createTask } from "@/features/tasks/domain";

test("task is overdue when due date passed", async () => {
  const task = await Effect.runPromise(
    createTask({ text: "Test", dueDate: "2024-01-01" })
  );
  
  expect(isTaskOverdue(task, "2024-12-31")).toBe(true);
});
```

### Services
**Mock at repository boundary.**

```typescript
const mockRepo: TaskRepository = {
  getAll: () => Effect.succeed([mockTask1, mockTask2]),
  getById: (id) => Effect.succeed(mockTask1),
  save: () => Effect.void,
  // ...
};

const service = new TaskQueryServiceImpl(mockRepo);

test("gets overdue tasks", async () => {
  const result = await Effect.runPromise(
    service.getOverdueTasks("2024-12-31")
  );
  
  expect(result.length).toBe(1);
});
```

### Infrastructure
**Use in-memory database or test doubles.**

```typescript
import PouchDB from "pouchdb";
import memoryAdapter from "pouchdb-adapter-memory";

PouchDB.plugin(memoryAdapter);

const testDb = new PouchDB("test", { adapter: "memory" });
const repo = new PouchDBTaskRepository(testDb);

// Test actual database operations
```

## Common Patterns

### Pattern 1: Creating Branded Types

```typescript
// 1. Define Schema with composition
export const XSchema = Schema.Y.pipe(
  Schema.validation1(...),
  Schema.validation2(...),
  Schema.brand("X")
);

// 2. Extract type
export type X = Schema.Schema.Type<typeof XSchema>;

// 3. Create validated constructor
export const makeX = Schema.decodeUnknownSync(XSchema);

// 4. Optional: unsafe for constants
export const unsafeX = (v: Y) => v as X;
```

### Pattern 2: Discriminated Unions

```typescript
// 1. Define union type
export type MyType =
  | { readonly _tag: "VariantA"; readonly data: string }
  | { readonly _tag: "VariantB"; readonly count: number }
  | { readonly _tag: "VariantC" };

// 2. Create constructors
export const VariantA = (data: string): MyType => ({ _tag: "VariantA", data });
export const VariantB = (count: number): MyType => ({ _tag: "VariantB", count });
export const VariantC: MyType = { _tag: "VariantC" };

// 3. Pattern match
const result = (myValue: MyType) => {
  switch (myValue._tag) {
    case "VariantA": return myValue.data;
    case "VariantB": return myValue.count;
    case "VariantC": return 0;
  }
  // Compiler ensures all cases handled
};
```

### Pattern 3: Pure Calculations

```typescript
// Pass time/randomness as parameters (keeps it pure!)
export const isOverdue = (
  task: Task,
  currentDate: DueDate  // ← Time as parameter, not Date.now()
): boolean => {
  if (!task.dueDate) return false;
  return task.dueDate < currentDate;
};

// Immutable transformations
export const updateText = (task: Task, text: TaskText): Task => {
  return {
    ...task,  // Copy
    text,
    updatedAt: makeTimestamp()
  };
};
```

### Pattern 4: Repository Methods

```typescript
// Use pipe composition, not Effect.gen
getById(id: TaskId): Effect<Task, NotFoundError | DbError> {
  return pipe(
    Effect.tryPromise({
      try: () => this.db.get(id),
      catch: (error: any) =>
        error.status === 404
          ? NotFoundError.make(id)
          : DbError.make(error, "getById")
    }),
    Effect.map(fromLegacy)  // Convert to domain
  );
}
```

### Pattern 5: Service Methods

```typescript
// Simple: single repo call + calculation
getOverdueTasks(date: DueDate): Effect<Task[], DbError> {
  return pipe(
    this.repo.getAll(),
    Effect.map((tasks) => tasks.filter(t => isTaskOverdue(t, date)))
  );
}

// Complex: multiple calls with validation
moveTask(taskId: TaskId, newParentId: TaskId): Effect<void, ...> {
  return pipe(
    Effect.all({
      task: this.repo.getById(taskId),
      parent: this.repo.getById(newParentId),
      allTasks: this.repo.getAll()
    }),
    Effect.flatMap(({ task, parent, allTasks }): Effect<void, ConstraintViolationError | DbError> => {
      // Validation
      if (parent.path.includes(taskId)) {
        return Effect.fail(ConstraintViolationError.make(...));
      }
      
      // Use pure calculations
      const updated = updatePath(task, newPath);
      const descendants = getAllDescendants(allTasks, taskId);
      
      // Save
      return this.repo.saveMany([updated, ...descendants]);
    })
  );
}
```

### Pattern 6: Effect.Service Pattern

```typescript
// Define service using Effect.Service class
export class MyService extends Effect.Service<MyService>()("MyService", {
  effect: Effect.gen(function* () {
    const dependency = yield* MyDependency;

    const doSomething = (input: string) =>
      pipe(
        dependency.fetch(input),
        Effect.map((data) => transform(data))
      );

    return {
      doSomething,
    } as const;
  }),
  dependencies: [],
}) {
  // Optional: Test layer
  static Test = this.Default.pipe(Layer.provide(MyDependencyMock));
}

// Compose multiple services
export const AllServicesLive = Layer.mergeAll(
  ServiceA.Default,
  ServiceB.Default,
  ServiceC.Default
);

// Use in application
const program = Effect.gen(function* () {
  const service = yield* MyService;
  return yield* service.doSomething("input");
});

Effect.runPromise(program.pipe(Effect.provide(AllServicesLive)));
```

## Anti-Patterns (What NOT to Do)

### ❌ Don't Use Effect.gen
```typescript
// ❌ Causes implicit any errors
Effect.gen(function* (_) {
  const x = yield* _(something);
});

// ✅ Use pipe instead
pipe(
  something,
  Effect.map((x) => ...)
);
```

### ❌ Don't Mix I/O and Logic
```typescript
// ❌ Database call inside calculation
export const getOverdueTasks = async (repo) => {
  const tasks = await repo.getAll();  // I/O!
  return tasks.filter(t => t.dueDate < new Date());
};

// ✅ Separate I/O (service) from logic (calculation)
// Service:
getOverdueTasks(date): Effect<Task[]> {
  return pipe(
    repo.getAll(),  // I/O
    Effect.map(tasks => tasks.filter(t => isTaskOverdue(t, date)))
  );
}

// Calculation:
export const isTaskOverdue = (task, date) => task.dueDate < date;
```

### ❌ Don't Use Mutations
```typescript
// ❌ Mutates input
const updateTask = (task: Task, text: string) => {
  task.text = text;  // Mutation!
  return task;
};

// ✅ Returns new object
const updateTask = (task: Task, text: TaskText): Task => {
  return { ...task, text };
};
```

### ❌ Don't Use Class Inheritance
```typescript
// ❌ OOP inheritance
class TaskIdSchema extends Schema.String.pipe(...) {}

// ✅ Composition
const TaskIdSchema = Schema.String.pipe(...);
```

### ❌ Don't Use Primitive Types in Domain
```typescript
// ❌ Raw primitives
interface Task {
  id: string;  // Could be any string!
  text: string;  // Could be empty!
}

// ✅ Branded types
interface Task {
  readonly id: TaskId;  // Only valid UUIDs
  readonly text: TaskText;  // 1-500 chars, validated
}
```

## Current Progress

### ✅ Completed (Phases 1-3)

**Phase 1: Domain Layer**
- Value objects with Schema-first branded types
- Immutable Task entity
- TaskState as discriminated union
- Domain events
- Pure composition (no inheritance)

**Phase 2: Calculation Layer**
- 45+ pure functions
- Path, Task, Tree, Progress calculations
- 100% pure (no side effects)
- Fully testable

**Phase 3: Service & Repository Layer**
- TaskRepository interface + PouchDB adapter
- TaskQueryService (9 operations)
- TaskCommandService (8 operations)
- Typed errors
- Effect-based I/O
- Pipe composition
- Layer-based DI

### 🔄 Next Steps (Phases 4-6)

**Phase 4: Migration**
- Update useTaskHooks to use services
- Convert React hooks to Effect
- Backward compatibility shims

**Phase 5: Use Cases**
- High-level workflows
- Combine multiple services
- Transaction boundaries

**Phase 6: UI Updates**
- Update components to use services
- Add error boundaries
- Loading states
- Optimistic updates

## Quick Reference

### Creating a New Value Object

```typescript
// 1. Schema
export const MyTypeSchema = Schema.String.pipe(
  Schema.minLength(1),
  Schema.brand("MyType")
);

// 2. Type
export type MyType = Schema.Schema.Type<typeof MyTypeSchema>;

// 3. Constructor
export const makeMyType = Schema.decodeUnknownSync(MyTypeSchema);
```

### Creating a Pure Calculation

```typescript
// No I/O, no side effects, time as parameter
export const myCalculation = (
  input: Task,
  currentTime: DueDate  // ← Pass as param!
): OutputType => {
  // Pure transformation
  return result;
};
```

### Creating a Repository Method

```typescript
myMethod(): Effect<Result, MyError> {
  return pipe(
    Effect.tryPromise({
      try: () => this.db.someMethod(),
      catch: (error) => MyError.make(error)
    }),
    Effect.map(convertToDomain)
  );
}
```

### Creating a Service Method

```typescript
myOperation(params): Effect<Result, SomeError> {
  return pipe(
    this.repo.getData(),
    Effect.map((data) => pureCalculation(data, params)),
    Effect.tap((result) => this.repo.save(result))
  );
}
```

## Resources

- **Domain-Driven Design**: Scott Wlaschin's "Domain Modeling Made Functional"
- **Grokking Simplicity**: Eric Normand (calculations vs actions, stratified design)
- **Effect**: https://effect.website/docs/introduction
- **Our Docs**: 
  - `docs/todo.md` - Full refactoring plan
  - `docs/phase1-summary.md` - Domain layer details
  - `docs/phase2-summary.md` - Calculations layer details
  - `docs/phase3-summary.md` - Services layer details
  - `docs/composition-vs-inheritance.md` - Composition patterns
  - `docs/architecture-layers.md` - Layer architecture

## Commands

```bash
# Build
npm run build

# Test
npm test

# Type check
npx tsc --noEmit
```

---

**Last Updated:** Phase 3 complete - Repository and Service layers implemented with Effect
**Status:** Ready for Phase 4 (Migration)
**Build:** ✅ Passing
**Tests:** ✅ 168 passing (9 pre-existing failures unrelated to refactor)
