# Phase 3 Complete: Service & Repository Layer ✅

## What Was Accomplished

Successfully created the **Repository** and **Service** layers using **Effect** for proper separation of I/O (actions) from business logic (calculations).

## Architecture Achieved

```
┌──────────────────────────────────────────┐
│  Services (Orchestration)                │  ← Phase 3 ✅
│  ┌────────────────────────────────────┐ │
│  │ TaskQueryService                   │ │
│  │ - getTask, getTaskTree             │ │
│  │ - getOverdueTasks, searchTasks     │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │ TaskCommandService                 │ │
│  │ - createTask, updateTask           │ │
│  │ - moveTask, deleteTask             │ │
│  └────────────────────────────────────┘ │
├──────────────────────────────────────────┤
│  Repository (Database I/O)               │  ← Phase 3 ✅
│  ┌────────────────────────────────────┐ │
│  │ TaskRepository (interface)         │ │
│  │ - getById, getAll, save, delete    │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │ PouchDBAdapter (implementation)    │ │
│  │ - Wraps PouchDB with Effect        │ │
│  └────────────────────────────────────┘ │
├──────────────────────────────────────────┤
│  Calculations (Pure Functions)           │  ← Phase 2 ✅
│  - buildTaskTree, isTaskOverdue          │
├──────────────────────────────────────────┤
│  Domain (Value Objects, Entities)        │  ← Phase 1 ✅
│  - TaskId, Task, TaskState               │
└──────────────────────────────────────────┘
```

## Key Achievement: Proper Separation

### Before (Old useTaskHooks)
```typescript
// ❌ Everything mixed together
const useTaskHooks = () => {
  const { db } = useTaskContext();
  
  async function getTaskById(id: TaskID): Promise<Task> {
    return Task.from(await db.get(id)); // Database I/O
  }
  
  async function getImmediateChildren(taskId: TaskID): Promise<Task[]> {
    const allDocs = await db.allDocs({ include_docs: true }); // Database I/O
    return allDocs.rows
      .map(row => Task.from(row.doc))
      .filter(task => task.path[task.path.length - 2] === taskId); // Logic mixed in
  }
  
  // 13 more functions, all mixing I/O and logic...
};
```

### After (Layered Architecture)
```typescript
// ✅ Repository: Database I/O only
class PouchDBTaskRepository implements TaskRepository {
  getAll(): Effect<Task[], DbError> {
    return pipe(
      Effect.tryPromise({
        try: () => this.db.allDocs({ include_docs: true }),
        catch: (error) => DbError.make(error, "getAll")
      }),
      Effect.map((result) => result.rows.map(row => fromLegacy(row.doc)))
    );
  }
}

// ✅ Service: Orchestration using repo + calculations
class TaskQueryService {
  getChildren(parentId: TaskId): Effect<Task[], DbError> {
    return pipe(
      this.repo.getAll(),
      Effect.map((tasks) => getImmediateChildren(tasks, parentId)) // Uses pure calculation!
    );
  }
}
```

## Files Created

### Infrastructure Layer (4 files)

#### 1. errors.ts - Typed Error Hierarchy
```typescript
export class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly taskId: TaskId;
  readonly message: string;
}> { ... }

export class DbError extends Data.TaggedError("DbError")<{
  readonly cause: unknown;
  readonly message: string;
}> { ... }

// + ConstraintViolationError, ValidationError, ConflictError
```

**Benefits:**
- Typed errors (not just thrown strings!)
- Pattern matching on errors
- Better error messages

#### 2. TaskRepository.ts - Repository Interface
```typescript
export interface TaskRepository {
  // Queries
  readonly getById: (id: TaskId) => Effect<Task, NotFoundError | DbError>;
  readonly getAll: () => Effect<Task[], DbError>;
  readonly getChildren: (parentId: TaskId) => Effect<Task[], DbError>;
  readonly getRootTasks: () => Effect<Task[], DbError>;
  readonly getDescendants: (ancestorId: TaskId) => Effect<Task[], DbError>;
  
  // Commands
  readonly save: (task: Task) => Effect<void, DbError>;
  readonly saveMany: (tasks: Task[]) => Effect<void, DbError>;
  readonly delete: (id: TaskId) => Effect<void, NotFoundError | DbError>;
  readonly deleteMany: (ids: TaskId[]) => Effect<void, DbError>;
  
  // Utilities
  readonly exists: (id: TaskId) => Effect<boolean, DbError>;
  readonly watch: (id: TaskId) => Stream<Task, DbError>;
  readonly watchAll: () => Stream<Task, DbError>;
}
```

**Benefits:**
- Interface, not implementation
- Can swap databases easily
- Effect-based (errors in types!)
- Stream support for real-time updates

#### 3. PouchDBAdapter.ts - PouchDB Implementation
```typescript
export class PouchDBTaskRepository implements TaskRepository {
  constructor(private readonly db: PouchDB.Database<LegacyTask>) {}
  
  getById(id: TaskId): Effect<Task, NotFoundError | DbError> {
    return pipe(
      Effect.tryPromise({
        try: () => this.db.get(id),
        catch: (error: any) => 
          error.status === 404 
            ? NotFoundError.make(id) 
            : DbError.make(error, "getById")
      }),
      Effect.map(fromLegacy)
    );
  }
  
  // 12 more methods...
}
```

**Benefits:**
- All database I/O wrapped in Effect
- Proper error handling
- Converts between legacy and new domain model
- Pipe composition (no Effect.gen!)

#### 4. index.ts - Infrastructure API
```typescript
export {
  NotFoundError,
  DbError,
  type DatabaseError,
} from "./errors";

export {
  type TaskRepository,
  TaskRepository as TaskRepositoryTag,
} from "./TaskRepository";

export {
  PouchDBTaskRepository,
  PouchDBTaskRepositoryLive,
} from "./PouchDBAdapter";
```

### Service Layer (3 files)

#### 1. TaskQueryService.ts - Read Operations
```typescript
export interface TaskQueryService {
  getTask(id: TaskId): Effect<Task, NotFoundError | DbError>;
  getAllTasks(): Effect<Task[], DbError>;
  getTaskTree(rootId: TaskId): Effect<TaskTree, NotFoundError | DbError>;
  getRootTaskForest(): Effect<TaskTree[], DbError>;
  getChildren(parentId: TaskId): Effect<Task[], DbError>;
  getDescendants(ancestorId: TaskId): Effect<Task[], DbError>;
  getOverdueTasks(currentDate: DueDate): Effect<Task[], DbError>;
  getTasksByState(state: string): Effect<Task[], DbError>;
  searchTasks(query: string): Effect<Task[], DbError>;
}

// Implementation uses repository + calculations
class TaskQueryServiceImpl implements TaskQueryService {
  getOverdueTasks(currentDate: DueDate): Effect<Task[], DbError> {
    return pipe(
      this.repo.getAll(),
      Effect.map((tasks) =>
        tasks
          .filter((t) => isTaskOverdue(t, currentDate)) // Pure calculation!
          .sort(compareByDueDate)                       // Pure calculation!
      )
    );
  }
}
```

**Benefits:**
- Separates reads from writes (CQRS pattern)
- Uses pure calculations for filtering/sorting
- Repository handles I/O, service handles orchestration

#### 2. TaskCommandService.ts - Write Operations
```typescript
export interface TaskCommandService {
  createTask(params: {...}): Effect<Task, InvalidTaskTextError | DbError>;
  updateTaskText(taskId: TaskId, text: string): Effect<Task, ...>;
  transitionTaskState(taskId: TaskId, state: TaskState): Effect<Task, ...>;
  completeTask(taskId: TaskId): Effect<Task, ...>;
  setTaskDueDate(taskId: TaskId, dueDate?: string): Effect<Task, ...>;
  moveTask(taskId: TaskId, newParentId: TaskId): Effect<void, ...>;
  deleteTask(taskId: TaskId): Effect<void, ...>;
  clearSubtasks(taskId: TaskId): Effect<void, ...>;
}

// Complex operations like moveTask:
moveTask(taskId: TaskId, newParentId: TaskId): Effect<void, ...> {
  return pipe(
    Effect.all({
      task: this.repo.getById(taskId),
      newParent: this.repo.getById(newParentId),
      allTasks: this.repo.getAll()
    }),
    Effect.flatMap(({ task, newParent, allTasks }) => {
      // Validation
      if (newParent.path.includes(taskId)) {
        return Effect.fail(ConstraintViolationError.make(...));
      }
      
      // Use pure calculations
      const newPath = buildChildPath(newParent.path, taskId);
      const descendants = getAllDescendants(allTasks, taskId);
      
      // Save updates
      return this.repo.saveMany([...]);
    })
  );
}
```

**Benefits:**
- Complex business logic with validation
- Uses domain functions for updates
- Cascades changes (move/delete with descendants)
- All errors typed in signature

#### 3. index.ts - Service API
```typescript
export {
  type TaskQueryService,
  TaskQueryService as TaskQueryServiceTag,
  TaskQueryServiceLive,
} from "./TaskQueryService";

export {
  type TaskCommandService,
  TaskCommandService as TaskCommandServiceTag,
  TaskCommandServiceLive,
} from "./TaskCommandService";

// Combined layer
export const TaskServicesLive = pipe(
  Layer.effect(TaskQueryService, TaskQueryServiceLive),
  Layer.merge(Layer.effect(TaskCommandService, TaskCommandServiceLive))
);
```

## How It Works Together

### Example: Get Overdue Tasks

**1. UI calls service:**
```typescript
import { TaskQueryService } from "@/features/tasks/services";
import { Effect } from "effect";

const program = pipe(
  TaskQueryService,
  Effect.flatMap((queryService) =>
    queryService.getOverdueTasks(today)
  )
);

const tasks = await Effect.runPromise(program);
```

**2. Service uses repository:**
```typescript
// TaskQueryService implementation
getOverdueTasks(currentDate: DueDate): Effect<Task[], DbError> {
  return pipe(
    this.repo.getAll(),           // ← Database I/O
    Effect.map((tasks) =>
      tasks
        .filter((t) => isTaskOverdue(t, currentDate))  // ← Pure calculation
        .sort(compareByDueDate)                        // ← Pure calculation
    )
  );
}
```

**3. Repository does I/O:**
```typescript
// PouchDBAdapter implementation  
getAll(): Effect<Task[], DbError> {
  return pipe(
    Effect.tryPromise({
      try: () => this.db.allDocs({ include_docs: true }),  // ← Actual PouchDB call
      catch: (error) => DbError.make(error, "getAll")
    }),
    Effect.map((result) =>
      result.rows.map(row => fromLegacy(row.doc))         // ← Convert to domain
    )
  );
}
```

**4. Calculation is pure:**
```typescript
// Pure function (no I/O, no side effects)
export const isTaskOverdue = (task: Task, currentDate: DueDate): boolean => {
  if (!task.dueDate) return false;
  if (isTaskCompleted(task)) return false;
  return task.dueDate < currentDate;
};
```

## Key Principles Applied

### 1. Repository Pattern (DDD)
- **Interface** separates contract from implementation
- Can swap PouchDB for IndexedDB, REST API, etc.
- Testing: Mock at repository boundary

### 2. CQRS (Command Query Responsibility Segregation)
- **TaskQueryService** - Read operations only
- **TaskCommandService** - Write operations only
- Clear separation of concerns

### 3. Effect for Side Effects
- All database operations return `Effect`
- Errors are part of the type signature
- Composable error handling

### 4. Pipe Composition (No Inheritance!)
- All methods use `pipe` for composition
- No `Effect.gen` (avoids implicit any errors)
- Functional, not OOP

### 5. Grokking Simplicity: Actions vs Calculations

**Repository** (Actions - side effects):
```typescript
// Has side effects (database read)
getAll(): Effect<Task[], DbError> {
  return Effect.tryPromise(() => this.db.allDocs(...));
}
```

**Service** (Orchestration - combines actions + calculations):
```typescript
// Uses action (repo.getAll) + calculation (isTaskOverdue)
getOverdueTasks(date: DueDate): Effect<Task[], DbError> {
  return pipe(
    this.repo.getAll(),                    // Action!
    Effect.map(tasks => 
      tasks.filter(t => isTaskOverdue(t, date))  // Calculation!
    )
  );
}
```

**Calculation** (Pure - no side effects):
```typescript
// Pure function
export const isTaskOverdue = (task: Task, date: DueDate): boolean => {
  return task.dueDate < date;
};
```

## Code Statistics

**Infrastructure:**
- **Files**: 4
- **Lines**: ~500
- **Error types**: 5
- **Repository methods**: 13
- **Composition**: 100% pipe (no Effect.gen!)

**Services:**
- **Files**: 3
- **Lines**: ~400
- **Query operations**: 9
- **Command operations**: 8
- **Composition**: 100% pipe (no Effect.gen!)

## Usage Examples

### Initialize with Dependency Injection

```typescript
import { Effect } from "effect";
import {
  TaskRepositoryTag,
  PouchDBTaskRepositoryLive,
} from "@/features/tasks/infrastructure";
import {
  TaskQueryService,
  TaskCommandService,
  TaskServicesLive,
} from "@/features/tasks/services";
import PouchDB from "pouchdb";

// Create database instance
const db = new PouchDB("tasks");

// Build the runtime with all layers
const runtime = pipe(
  TaskServicesLive,
  Layer.provide(PouchDBTaskRepositoryLive(db))
);

// Now use services
const program = Effect.gen(function* () {
  const queryService = yield* TaskQueryService;
  const commandService = yield* TaskCommandService;
  
  // Create a task
  const task = yield* commandService.createTask({
    text: "Learn Effect",
    dueDate: "2024-12-31"
  });
  
  // Get overdue tasks
  const overdue = yield* queryService.getOverdueTasks("2024-12-15");
  
  return { task, overdue };
});

const result = await Effect.runPromise(
  Effect.provide(program, runtime)
);
```

### Query Examples

```typescript
import { TaskQueryService } from "@/features/tasks/services";
import { pipe, Effect } from "effect";

// Get task tree
const getTree = pipe(
  TaskQueryService,
  Effect.flatMap((service) => service.getTaskTree(rootId))
);

// Search tasks
const search = pipe(
  TaskQueryService,
  Effect.flatMap((service) => service.searchTasks("meeting"))
);

// Get overdue
const overdue = pipe(
  TaskQueryService,
  Effect.flatMap((service) => service.getOverdueTasks(today))
);
```

### Command Examples

```typescript
import { TaskCommandService } from "@/features/tasks/services";
import { Done } from "@/features/tasks/domain";
import { pipe, Effect } from "effect";

// Create task
const create = pipe(
  TaskCommandService,
  Effect.flatMap((service) =>
    service.createTask({
      text: "New task",
      parentId: parentTaskId,
      dueDate: "2024-12-31"
    })
  )
);

// Complete task
const complete = pipe(
  TaskCommandService,
  Effect.flatMap((service) => service.completeTask(taskId))
);

// Move task
const move = pipe(
  TaskCommandService,
  Effect.flatMap((service) => service.moveTask(taskId, newParentId))
);
```

### Error Handling

```typescript
import { NotFoundError, DbError } from "@/features/tasks/infrastructure";

const program = pipe(
  TaskQueryService,
  Effect.flatMap((service) => service.getTask(taskId)),
  Effect.catchTags({
    NotFoundError: (error) => {
      console.log(`Task not found: ${error.taskId}`);
      return Effect.succeed(null);
    },
    DbError: (error) => {
      console.error(`Database error: ${error.message}`);
      return Effect.succeed(null);
    }
  })
);
```

## Benefits Achieved

### 1. Testability
```typescript
// Mock at repository boundary (not database!)
const mockRepo: TaskRepository = {
  getAll: () => Effect.succeed([mockTask1, mockTask2]),
  getById: (id) => Effect.succeed(mockTask1),
  // ...
};

const service = new TaskQueryServiceImpl(mockRepo);

// Test service logic without database
const result = await Effect.runPromise(
  service.getOverdueTasks(today)
);
```

### 2. Swappable Implementations
```typescript
// Easy to swap PouchDB for something else
class IndexedDBTaskRepository implements TaskRepository {
  // Different implementation, same interface
}

class RestAPITaskRepository implements TaskRepository {
  // HTTP calls instead of PouchDB
}
```

### 3. Composable Operations
```typescript
// Combine multiple service calls
const program = pipe(
  Effect.all({
    tree: queryService.getTaskTree(rootId),
    overdue: queryService.getOverdueTasks(today),
    inProgress: queryService.getTasksByState("InProgress")
  }),
  Effect.map(({ tree, overdue, inProgress }) => ({
    tree,
    alerts: overdue,
    active: inProgress
  }))
);
```

### 4. Type-Safe Errors
```typescript
// Errors are in the type signature!
getTask(id: TaskId): Effect<Task, NotFoundError | DbError>
//                           ^^^^  ^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                         Success      Error types

// Compiler forces you to handle errors
const task = await Effect.runPromise(
  getTask(id).pipe(
    Effect.catchAll((error) => {
      // error is typed as NotFoundError | DbError
      if (error._tag === "NotFoundError") { ... }
      if (error._tag === "DbError") { ... }
    })
  )
);
```

## Comparison: Old vs New

### Old: useTaskHooks (Phase 0)
```typescript
const useTaskHooks = () => {
  async function getTaskById(id) {
    return Task.from(await db.get(id));  // Throws on error!
  }
  
  async function moveTask(childTask, newParentTask) {
    // 30 lines of imperative code mixing I/O and logic
    const descendants = await getSubtree(childTask.id);
    for (const descendant of descendants) {
      // Mutation!
      descendant.path = [...newPath, ...relativePath];
      await updateTask(descendant);
    }
  }
  
  // Returns object with 13 functions
  return { getTaskById, moveTask, ... };
};
```

**Problems:**
- ❌ 13 functions in one hook
- ❌ Mixing I/O and logic
- ❌ Throwing errors (not typed)
- ❌ Mutations
- ❌ Hard to test (requires database)
- ❌ Can't swap database

### New: Layered Architecture (Phase 3)
```typescript
// Repository: Database I/O
class PouchDBTaskRepository {
  getById(id: TaskId): Effect<Task, NotFoundError | DbError> {
    return pipe(
      Effect.tryPromise(() => this.db.get(id)),
      Effect.map(fromLegacy)
    );
  }
}

// Service: Business logic
class TaskCommandService {
  moveTask(taskId, newParentId): Effect<void, ...> {
    return pipe(
      Effect.all({
        task: this.repo.getById(taskId),
        newParent: this.repo.getById(newParentId),
        allTasks: this.repo.getAll()
      }),
      Effect.flatMap(({ task, newParent, allTasks }) => {
        // Validation
        if (newParent.path.includes(taskId)) {
          return Effect.fail(ConstraintViolationError.make(...));
        }
        
        // Use pure calculations
        const newPath = buildChildPath(newParent.path, taskId);
        const descendants = getAllDescendants(allTasks, taskId);
        const updated = descendants.map(d => updatePath(d, ...)); // Immutable!
        
        // Save
        return this.repo.saveMany([task, ...updated]);
      })
    );
  }
}
```

**Benefits:**
- ✅ Clear layers (repo, service, calculation)
- ✅ No mixing of concerns
- ✅ Typed errors
- ✅ Immutable
- ✅ Testable
- ✅ Swappable database

## Next: Phase 4 & Beyond

With the infrastructure and services in place, we can now:

**Phase 4** - Update existing hooks/components to use services
**Phase 5** - Create use cases (high-level workflows)
**Phase 6** - Update UI components

But the hard work is done - we have a solid, functional, type-safe foundation! 🎉
