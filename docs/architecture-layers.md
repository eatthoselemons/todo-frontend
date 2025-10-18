# Architecture Layers Clarification

## Current Confusion

You're right! The **Calculations layer** (Phase 2) doesn't touch the database - it only works on **in-memory data structures**.

### What We Have Now

```typescript
// ✅ Phase 2: Calculations (Pure functions on data)
export const findInTree = (tree: TaskTree, taskId: TaskId): Task | undefined => {
  // Works on already-loaded tree in memory
  if (tree.task.id === taskId) return tree.task;
  // ... searches in-memory structure
};
```

### What's Missing

```typescript
// ❌ Missing: Database layer (I/O operations)
export const findTaskById = (taskId: TaskId): Effect<Task, DbError> => {
  // Should fetch from PouchDB!
  return Effect.gen(function* (_) {
    const doc = yield* _(db.get(taskId)); // Database I/O!
    return fromLegacy(doc);
  });
};
```

## Correct Architecture

Following **Grokking Simplicity** and **DDD**, we need these layers:

```
┌──────────────────────────────────────────┐
│  UI Components (React)                   │  Phase 6
│  - useTaskHooks (converted to services)  │
├──────────────────────────────────────────┤
│  Application Layer (Use Cases)           │  Phase 5
│  - CreateTaskUseCase                     │
│  - CompleteTaskUseCase                   │
│  - MoveTaskUseCase                       │
├──────────────────────────────────────────┤
│  Service Layer                           │  Phase 3 (NEXT!)
│  ┌────────────────────────────────────┐ │
│  │ Query Services                     │ │
│  │ - GetTaskService                   │ │
│  │ - GetTaskTreeService               │ │
│  │ - SearchTasksService               │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │ Command Services                   │ │
│  │ - CreateTaskService                │ │
│  │ - UpdateTaskService                │ │
│  │ - DeleteTaskService                │ │
│  └────────────────────────────────────┘ │
├──────────────────────────────────────────┤
│  Repository/Database Layer               │  Phase 3 (NEXT!)
│  ┌────────────────────────────────────┐ │
│  │ TaskRepository (interface)         │ │
│  │ - getById(id): Effect<Task>        │ │  ← Database I/O!
│  │ - getAll(): Effect<Task[]>         │ │  ← Database I/O!
│  │ - save(task): Effect<void>         │ │  ← Database I/O!
│  │ - delete(id): Effect<void>         │ │  ← Database I/O!
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │ PouchDBAdapter (implementation)    │ │
│  │ - Wraps PouchDB with Effect        │ │
│  │ - Handles errors                   │ │
│  │ - Does actual database calls       │ │
│  └────────────────────────────────────┘ │
├──────────────────────────────────────────┤
│  Calculations Layer (Pure Functions)     │  Phase 2 ✅ DONE
│  - buildTaskTree(tasks, id)              │  ← Works on data
│  - findInTree(tree, id)                  │  ← Works on data
│  - isTaskOverdue(task, date)             │  ← Works on data
│  - All PURE (no I/O, no side effects)    │
├──────────────────────────────────────────┤
│  Domain Layer (Value Objects, Entities)  │  Phase 1 ✅ DONE
│  - TaskId, TaskText (branded types)      │
│  - Task (immutable entity)               │
│  - TaskState (discriminated union)       │
└──────────────────────────────────────────┘
```

## How They Work Together

### Example: Get Overdue Tasks

#### 1. Repository (Database I/O)
```typescript
// Does actual database reads
class PouchDBTaskRepository {
  getAll(): Effect<Task[], DbError> {
    return Effect.gen(function* (_) {
      const result = yield* _(
        Effect.tryPromise({
          try: () => this.db.allDocs({ include_docs: true }),
          catch: (error) => new DbError(error)
        })
      );
      
      return result.rows
        .map(row => fromLegacy(row.doc))
        .filter(task => task.id !== ROOT_TASK_ID);
    });
  }
}
```

#### 2. Service (Orchestration)
```typescript
// Combines repository + calculations
class TaskQueryService {
  getOverdueTasks(today: DueDate): Effect<Task[], DbError> {
    return Effect.gen(function* (_) {
      const repo = yield* _(TaskRepository);
      
      // Get from database
      const allTasks = yield* _(repo.getAll());
      
      // Use pure calculation!
      return allTasks.filter(task => isTaskOverdue(task, today));
    });
  }
}
```

#### 3. Calculation (Pure Function)
```typescript
// Works on in-memory data (no I/O!)
export const isTaskOverdue = (task: Task, currentDate: DueDate): boolean => {
  if (!task.dueDate) return false;
  if (isTaskCompleted(task)) return false;
  return task.dueDate < currentDate;
};
```

## Why This Separation?

### Benefits

1. **Testability**
   - Calculations: Test with pure data (no mocks!)
   - Repository: Mock at repository boundary
   - Services: Test with mock repository

2. **Flexibility**
   - Can swap PouchDB for IndexedDB
   - Can add caching layer
   - Can switch to remote database

3. **Clear Responsibilities**
   - Calculations: Business logic
   - Repository: Data access
   - Services: Orchestration

4. **Grokking Simplicity**
   - Calculations: Pure (no side effects)
   - Repository: Actions (side effects isolated)
   - Services: Combine calculations + actions

## What Phase 3 Should Build

### 1. Repository Interface
```typescript
export interface TaskRepository {
  // Queries
  getById(id: TaskId): Effect<Task, NotFoundError | DbError>;
  getAll(): Effect<Task[], DbError>;
  getChildren(parentId: TaskId): Effect<Task[], DbError>;
  getRootTasks(): Effect<Task[], DbError>;
  
  // Commands
  save(task: Task): Effect<void, DbError>;
  delete(id: TaskId): Effect<void, DbError>;
  
  // Watching
  watch(id: TaskId): Stream<Task, DbError>;
}
```

### 2. PouchDB Adapter
```typescript
export class PouchDBTaskRepository implements TaskRepository {
  constructor(private db: PouchDB.Database) {}
  
  getById(id: TaskId): Effect<Task, NotFoundError | DbError> {
    return Effect.gen(function* (_) {
      const doc = yield* _(
        Effect.tryPromise({
          try: () => this.db.get(id),
          catch: (err: any) => 
            err.status === 404 
              ? new NotFoundError(id) 
              : new DbError(err)
        })
      );
      return fromLegacy(doc);
    });
  }
  
  // ... more implementations
}
```

### 3. Query Services
```typescript
export class TaskQueryService {
  // Use repository + calculations
  getTaskTree(rootId: TaskId): Effect<TaskTree, DbError> {
    return Effect.gen(function* (_) {
      const repo = yield* _(TaskRepository);
      const allTasks = yield* _(repo.getAll());
      
      // Use pure calculation!
      const tree = buildTaskTree(allTasks, rootId);
      
      if (!tree) {
        return yield* _(Effect.fail(new NotFoundError(rootId)));
      }
      
      return tree;
    });
  }
}
```

## Summary

- **Calculations** (Phase 2 ✅): Pure functions on data
- **Repository** (Phase 3 - needed!): Database I/O with Effect
- **Services** (Phase 3 - needed!): Orchestration using repo + calculations
- **Use Cases** (Phase 5): High-level workflows

You're absolutely right - we need the database layer next!
