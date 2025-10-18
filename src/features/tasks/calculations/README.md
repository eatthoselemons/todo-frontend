# Calculations Layer

## Overview

The **Calculations Layer** contains **pure functions** for task operations. Following **Grokking Simplicity**, we separate:

- **Calculations** (pure functions) - This layer ✅
- **Actions** (side effects) - Service layer (Phase 3)

## Key Principle: Pure Functions

All functions in this layer are **PURE**:

```typescript
// ✅ PURE - Same inputs always give same outputs
export const isTaskOverdue = (task: Task, currentDate: DueDate): boolean => {
  if (!task.dueDate) return false;
  return task.dueDate < currentDate;
};

// ❌ IMPURE - Uses Date.now() (side effect!)
export const isTaskOverdue = (task: Task): boolean => {
  const today = new Date().toISOString(); // ❌ Not pure!
  return task.dueDate < today;
};
```

## Files

### PathCalculations.ts
Pure functions for path operations:
- `getParentId` - Get parent from task
- `isDescendantOf` - Check ancestry
- `buildChildPath` - Build new paths
- `calculateMovedPath` - Path after move
- And more...

### TaskCalculations.ts
Pure functions for individual tasks:
- `isTaskOverdue` - Check if overdue
- `wasCompletedToday` - Check completion
- `getDaysUntilDue` - Calculate days remaining
- `compareByDueDate` - Sort comparators
- And more...

### TreeCalculations.ts
Pure functions for tree operations:
- `buildTaskTree` - Flat list → tree
- `flattenTree` - Tree → flat list
- `findInTree` - Search tree
- `updateInTree` - Immutable updates
- And more...

### ProgressCalculations.ts
Pure functions for progress tracking:
- `calculateProgress` - Stats calculation
- `calculateVelocity` - Tasks per day
- `estimateCompletionDate` - Forecast
- `calculateBurndown` - Chart data
- And more...

## Usage Examples

### Path Calculations

```typescript
import { getParentId, isDescendantOf } from "@/features/tasks/calculations";

const parent = getParentId(task);
const isChild = isDescendantOf(childTask, ancestorTask.id);
```

### Task Calculations

```typescript
import { isTaskOverdue, getDaysUntilDue } from "@/features/tasks/calculations";

const today = "2024-12-15"; // Pass as parameter (keeps it pure!)
const overdue = isTaskOverdue(task, today);
const daysLeft = getDaysUntilDue(task, today);
```

### Tree Calculations

```typescript
import { buildTaskTree, flattenTree } from "@/features/tasks/calculations";

// Build tree from flat list
const tree = buildTaskTree(tasks, rootId);

// Flatten back to list
const flat = flattenTree(tree);

// Update immutably
const updated = updateInTree(tree, taskId, (task) => ({
  ...task,
  text: makeTaskText("Updated!")
}));
```

### Progress Calculations

```typescript
import { calculateProgress, calculateVelocity } from "@/features/tasks/calculations";

// Get stats
const stats = calculateProgress(tasks);
console.log(`${stats.completionPercentage}% complete`);

// Calculate velocity
const completed = tasks.filter(t => t.state._tag === "Done");
const velocity = calculateVelocity(completed, startDate, endDate);
console.log(`${velocity} tasks/day`);
```

## Testing

Because all functions are pure, testing is **trivial** - no mocks needed!

```typescript
import { isTaskOverdue } from "@/features/tasks/calculations";

test("task is overdue when due date passed", () => {
  const task = {
    ...mockTask,
    dueDate: "2024-01-01"
  };
  
  expect(isTaskOverdue(task, "2024-12-31")).toBe(true);
  expect(isTaskOverdue(task, "2023-12-31")).toBe(false);
});

// No database! No mocks! Just pure data in, data out!
```

## Design Patterns

### 1. Pass Time as Parameter

```typescript
// ✅ Good - time is a parameter
export const isOverdue = (task: Task, currentDate: DueDate) => { ... };

// ❌ Bad - uses Date.now() inside
export const isOverdue = (task: Task) => {
  const now = Date.now(); // Impure!
};
```

### 2. Immutable Updates

```typescript
// ✅ Good - returns new tree
export const updateInTree = (
  tree: TaskTree,
  taskId: TaskId,
  updater: (task: Task) => Task
): TaskTree => {
  return {
    ...tree,
    children: tree.children.map(...)
  };
};

// ❌ Bad - mutates input
export const updateInTree = (tree: TaskTree, ...) => {
  tree.task = updater(tree.task); // Mutation!
};
```

### 3. Composable Functions

```typescript
// Functions compose naturally
const activeOverdueTasks = tasks
  .filter(t => t.state._tag === "InProgress")
  .filter(t => isTaskOverdue(t, today))
  .sort(compareByDueDate);
```

### 4. Higher-Order Functions

```typescript
// Take functions as arguments
export const filterTree = (
  tree: TaskTree,
  predicate: (task: Task) => boolean
): TaskTree | undefined => { ... };

// Use it
const onlyOverdue = filterTree(tree, (t) => 
  isTaskOverdue(t, today)
);
```

## Stratified Design

Layer structure (from bottom up):

```
┌─────────────────────────────────────┐
│  UI Components (React)              │  ← Phase 6
├─────────────────────────────────────┤
│  Use Cases (Commands/Queries)       │  ← Phase 5
├─────────────────────────────────────┤
│  Services (Effect services)         │  ← Phase 3
├─────────────────────────────────────┤
│  Calculations (Pure functions) ✅   │  ← Phase 2 (current)
├─────────────────────────────────────┤
│  Domain (Value objects, entities)   │  ← Phase 1 (done)
└─────────────────────────────────────┘
```

This layer only depends on the Domain layer - no services, no hooks, no React!

## Benefits

1. **Easy to Test** - No mocks, no setup, just pure data
2. **Easy to Reason About** - Input → Output, always
3. **Composable** - Functions combine naturally
4. **Reusable** - Can use anywhere (Node, browser, worker)
5. **Memoizable** - Same inputs = same outputs = can cache
6. **Parallelizable** - No side effects = safe to run in parallel

## Next: Phase 3

Phase 3 will create **Services** that wrap **Actions** (side effects) using Effect:
- Database operations (read/write)
- Network calls
- File I/O
- Logging

Services will use these calculations to implement business logic!
