# Task Domain Model

## Overview

This domain model follows **Domain-Driven Design** principles and **Grokking Simplicity** patterns to create a robust, type-safe foundation.

## Key Principles Applied

### 1. No Primitive Obsession (Grokking Simplicity)

Instead of using raw `string`, `number`, or `array` types, we wrap them in **Schema-first branded types**:

```typescript
// ❌ Bad: Primitive obsession
function updateTask(id: string, text: string) { ... }

// ✅ Good: Schema-first branded types
export class TaskIdSchema extends Schema.String.pipe(
  Schema.pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  Schema.brand("TaskId")
) {}

export type TaskId = Schema.Schema.Type<typeof TaskIdSchema>;
export const makeTaskId = Schema.decodeUnknownSync(TaskIdSchema);

function updateTask(id: TaskId, text: TaskText) { ... }
```

**Benefits:**
- Single source of truth (Schema defines type + validation)
- Compiler prevents mixing up different string types
- Cannot accidentally pass a random string as a TaskId
- Automatic validation on construction
- Self-documenting code
- Better Effect integration

### 2. Make Illegal States Unrepresentable (DDD)

The `TaskState` is a **discriminated union** (sum type), not a string enum:

```typescript
// ❌ Bad: Any string allowed
type TaskState = "NotStarted" | "InProgress" | "Blocked" | "Done";

// ✅ Good: Only valid states can exist
type TaskState =
  | { _tag: "NotStarted" }
  | { _tag: "InProgress" }
  | { _tag: "Blocked"; reason?: string }
  | { _tag: "Done" };
```

**Benefits:**
- Blocked state can carry additional data (reason)
- Pattern matching ensures all cases handled
- Impossible to create invalid states

### 3. Immutability (Grokking Simplicity)

All domain objects are **immutable**. Changes return new instances:

```typescript
// ❌ Bad: Mutation
task.text = "New text";
task.state = "Done";

// ✅ Good: Immutable transformations
const updatedTask = updateText(task, "New text");
const completedTask = completeTask(task);
```

**Benefits:**
- No accidental mutations
- Easy to reason about
- Enables time-travel debugging
- Thread-safe

### 4. Separate Calculations from Actions (Grokking Simplicity)

Domain functions are **pure calculations** - no side effects:

```typescript
// Pure calculation - no DB, no network, no Date.now()
export const isOverdue = (task: Task, currentDate: string): boolean => {
  if (!task.dueDate) return false;
  return task.dueDate < currentDate;
};
```

**Benefits:**
- Easy to test (no mocks needed)
- Can be memoized
- Predictable behavior
- Can be run anywhere

### 5. Smart Constructors with Effect (Railway-Oriented Programming)

Instead of throwing exceptions, we return `Effect` for explicit error handling:

```typescript
// Returns Effect<Task, InvalidTaskTextError>
const taskEffect = createTask({
  text: userInput,
  parentPath: parentTask.path
});

// Caller decides how to handle errors
const result = await Effect.runPromise(taskEffect);
```

**Benefits:**
- Errors are part of the type signature
- Caller must handle errors explicitly
- Composable error handling
- No hidden exceptions

## File Structure

```
domain/
├── ValueObjects.ts       # Branded primitive types
├── TaskState.ts          # State discriminated union
├── TaskEntity.ts         # Immutable Task entity
├── DomainEvents.ts       # Events that happened
├── index.ts              # Public API
└── README.md            # This file
```

## Usage Examples

### Creating a Task

```typescript
import { createTask, makeTaskPath, ROOT_TASK_ID } from "./domain";
import { Effect } from "effect";

const createNewTask = Effect.gen(function* (_) {
  // Create with validation
  const task = yield* _(createTask({
    text: "Write documentation",
    parentPath: makeTaskPath([ROOT_TASK_ID]),
    dueDate: "2024-12-31"
  }));
  
  return task;
});

// Run the effect
const task = await Effect.runPromise(createNewTask);
```

### Creating Validated Types

```typescript
import { makeTaskId, makeTaskText } from "./domain";

// Validated - throws if invalid
const taskId = makeTaskId("550e8400-e29b-41d4-a716-446655440000");
const taskText = makeTaskText("My task"); // ✅ Valid

// Invalid inputs throw ParseError
try {
  const bad = makeTaskText(""); // ❌ Too short
} catch (error) {
  console.error("Validation failed");
}

// For constants, use unsafe constructor
import { unsafeTaskId } from "./domain";
const ROOT = unsafeTaskId("known-valid-uuid"); // No validation
```

### Updating Task State

```typescript
import { transitionState, Done } from "./domain";

const markAsDone = Effect.gen(function* (_) {
  const updatedTask = yield* _(transitionState(task, Done));
  
  // Domain event can be emitted here
  const event = taskCompleted({
    taskId: updatedTask.id,
    isRoot: isRoot(updatedTask)
  });
  
  return { task: updatedTask, event };
});
```

### Pattern Matching on State

```typescript
const getStatusColor = (state: TaskState): string => {
  switch (state._tag) {
    case "NotStarted": return "gray";
    case "InProgress": return "blue";
    case "Blocked": return "red";
    case "Done": return "green";
  }
  // TypeScript ensures all cases are handled
};
```

### Working with Events

```typescript
import { matchEvent, TaskDomainEvent } from "./domain";

const handleEvent = (event: TaskDomainEvent) => {
  matchEvent(event)
    .TaskCompleted((e) => {
      console.log(`Task ${e.taskId} completed at ${e.completedAt}`);
      if (e.isRoot) {
        // Trigger celebration animation
      }
    })
    .TaskMoved((e) => {
      console.log(`Task moved from ${e.oldPath} to ${e.newPath}`);
    });
};
```

## Migration from Legacy

The domain provides `toLegacy` and `fromLegacy` functions for backward compatibility:

```typescript
import { fromLegacy, toLegacy } from "./domain";

// From old format
const oldTask = await db.get(taskId);
const newTask = fromLegacy(oldTask);

// To old format (for saving)
const legacyFormat = toLegacy(newTask);
await db.put(legacyFormat);
```

## Next Steps

See `docs/todo.md` for the full refactoring plan. Phase 1 (Domain Model) is complete.

Phase 2 will create the **Calculation Layer** with pure functions for:
- Task tree operations
- Path calculations
- Progress calculations
- Due date calculations
