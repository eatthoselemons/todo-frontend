# Phase 2 Complete: Calculation Layer ✅

## What Was Accomplished

Successfully created the **Calculation Layer** with **45+ pure functions** following **Grokking Simplicity** principles: separating calculations (pure) from actions (side effects).

## Key Achievement: 100% Pure Functions

Every single function in this layer is **PURE**:
- ✅ No side effects
- ✅ No mutations
- ✅ No I/O (no database, network, filesystem)
- ✅ No Date.now(), no Math.random()
- ✅ Same inputs always produce same outputs
- ✅ Trivial to test (no mocks needed!)

## Files Created

### 1. PathCalculations.ts (15 functions)

Pure functions for task path operations:

```typescript
// Get parent from task
export const getParentId = (task: Task): TaskId | undefined;

// Check ancestry
export const isDescendantOf = (task: Task, ancestorId: TaskId): boolean;

// Build new paths
export const buildChildPath = (parentPath: TaskPath, childId: TaskId): TaskPath;

// Calculate path after move
export const calculateMovedPath = (taskId: TaskId, newParentPath: TaskPath): TaskPath;

// Find common ancestor
export const findCommonAncestor = (path1: TaskPath, path2: TaskPath): TaskId | undefined;
```

**And 10 more pure path functions!**

### 2. TaskCalculations.ts (15 functions)

Pure functions for individual task operations:

```typescript
// Check if overdue (time as parameter - keeps it pure!)
export const isTaskOverdue = (task: Task, currentDate: DueDate): boolean;

// Days until due
export const getDaysUntilDue = (task: Task, currentDate: DueDate): number | undefined;

// Was completed today?
export const wasCompletedToday = (task: Task, today: DueDate): boolean;

// Sort comparators
export const compareByDueDate = (a: Task, b: Task): number;
export const compareByCreationDate = (a: Task, b: Task): number;
```

**And 10 more pure task functions!**

### 3. TreeCalculations.ts (20 functions)

Pure functions for tree operations:

```typescript
// Flat list → tree structure
export const buildTaskTree = (tasks: Task[], rootId: TaskId): TaskTree | undefined;

// Tree → flat list
export const flattenTree = (tree: TaskTree): Task[];

// Search tree
export const findInTree = (tree: TaskTree, taskId: TaskId): Task | undefined;

// Update tree (immutable!)
export const updateInTree = (
  tree: TaskTree,
  taskId: TaskId,
  updater: (task: Task) => Task
): TaskTree;

// Higher-order functions
export const filterTree = (tree: TaskTree, predicate: (task: Task) => boolean): TaskTree | undefined;
export const mapTree = (tree: TaskTree, mapper: (task: Task) => Task): TaskTree;
export const sortTree = (tree: TaskTree, comparator: (a: Task, b: Task) => number): TaskTree;
```

**And 13 more pure tree functions!**

### 4. ProgressCalculations.ts (12 functions)

Pure functions for progress tracking:

```typescript
// Calculate statistics
export const calculateProgress = (tasks: Task[]): ProgressStats;

// Velocity (tasks per day)
export const calculateVelocity = (
  completedTasks: Task[],
  startDate: Date,
  endDate: Date
): number;

// Burndown chart data
export const calculateBurndown = (
  tasks: Task[],
  startDate: Date,
  endDate: Date
): BurndownPoint[];

// Metrics
export const calculateAverageCycleTime = (completedTasks: Task[]): number;
export const calculateAverageLeadTime = (completedTasks: Task[]): number;
```

**And 7 more pure progress functions!**

## Grokking Simplicity Principles Applied

### 1. Calculations vs Actions

**Calculation** (this layer):
```typescript
// Pure - no side effects
export const isTaskOverdue = (task: Task, currentDate: DueDate): boolean => {
  if (!task.dueDate) return false;
  return task.dueDate < currentDate;
};
```

**Action** (Phase 3 - services):
```typescript
// Has side effects (database read)
export const getOverdueTasks = (): Effect.Effect<Task[], DbError> => {
  return Effect.gen(function* (_) {
    const tasks = yield* _(db.getAllTasks()); // Side effect!
    const today = new Date().toISOString(); // Side effect!
    return tasks.filter(t => isTaskOverdue(t, today)); // Uses calculation!
  });
};
```

### 2. Stratified Design

Clear layers (bottom-up):

```
┌─────────────────────────────────────┐
│  UI Components (React)              │  Phase 6
├─────────────────────────────────────┤
│  Use Cases (Commands/Queries)       │  Phase 5
├─────────────────────────────────────┤
│  Services (Effect services)         │  Phase 3 (next!)
├─────────────────────────────────────┤
│  Calculations (Pure functions) ✅   │  Phase 2 (done!)
├─────────────────────────────────────┤
│  Domain (Value objects, entities)   │  Phase 1 (done!)
└─────────────────────────────────────┘
```

### 3. Pass Data as Parameters

```typescript
// ✅ Good - time is a parameter (pure!)
export const isOverdue = (task: Task, currentDate: DueDate) => { ... };

// ❌ Bad - gets time internally (impure!)
export const isOverdue = (task: Task) => {
  const now = new Date(); // Side effect!
};
```

### 4. Immutable Data Transformations

```typescript
// ✅ Returns new tree (immutable)
export const updateInTree = (
  tree: TaskTree,
  taskId: TaskId,
  updater: (task: Task) => Task
): TaskTree => {
  return {
    task: tree.task,
    children: tree.children.map(child => updateInTree(child, taskId, updater))
  };
};

// ❌ Mutates input (avoid!)
export const updateInTree = (tree: TaskTree, ...) => {
  tree.task = updater(tree.task); // Mutation!
};
```

## Testing Benefits

Because all functions are pure, testing is **trivial**:

```typescript
import { isTaskOverdue, buildTaskTree } from "@/features/tasks/calculations";

// No setup needed!
// No mocks needed!
// No database needed!
// Just pure data in, data out!

test("task is overdue when due date passed", () => {
  const task = createTestTask({ dueDate: "2024-01-01" });
  
  expect(isTaskOverdue(task, "2024-12-31")).toBe(true);
  expect(isTaskOverdue(task, "2023-12-31")).toBe(false);
});

test("builds task tree from flat list", () => {
  const tasks = [
    createTestTask({ id: "1" }),
    createTestTask({ id: "2", path: ["1", "2"] })
  ];
  
  const tree = buildTaskTree(tasks, "1");
  
  expect(tree?.children.length).toBe(1);
  expect(tree?.children[0].task.id).toBe("2");
});
```

## Usage Examples

### Composing Functions

```typescript
import { 
  isTaskOverdue, 
  compareByDueDate,
  filterTree 
} from "@/features/tasks/calculations";

// Functions compose naturally!
const today = "2024-12-15";

// Get overdue in-progress tasks, sorted by due date
const urgentTasks = tasks
  .filter(t => t.state._tag === "InProgress")
  .filter(t => isTaskOverdue(t, today))
  .sort(compareByDueDate);

// Filter tree to only overdue tasks
const overdueTree = filterTree(tree, t => isTaskOverdue(t, today));
```

### Higher-Order Functions

```typescript
import { mapTree, updateInTree } from "@/features/tasks/calculations";

// Map over all tasks in tree
const upperCased = mapTree(tree, task => ({
  ...task,
  text: makeTaskText(task.text.toUpperCase())
}));

// Update specific task
const updated = updateInTree(tree, taskId, task => ({
  ...task,
  state: Done
}));
```

### Progress Tracking

```typescript
import {
  calculateProgress,
  calculateVelocity,
  calculateBurndown
} from "@/features/tasks/calculations";

// Get stats
const stats = calculateProgress(tasks);
console.log(`${stats.completionPercentage}% complete`);

// Calculate velocity
const velocity = calculateVelocity(
  completedTasks,
  new Date("2024-01-01"),
  new Date("2024-12-31")
);
console.log(`${velocity.toFixed(2)} tasks/day`);

// Get burndown data for chart
const burndown = calculateBurndown(tasks, startDate, endDate);
```

## Code Statistics

- **Files**: 4
- **Functions**: 45+
- **Pure**: 100%
- **Lines**: ~800
- **Dependencies**: Only domain layer
- **Side effects**: 0
- **Testability**: Maximum

## Benefits Achieved

1. **Trivial Testing** - No mocks, no setup
2. **Composable** - Functions combine naturally
3. **Reusable** - Can use anywhere (Node, browser, worker)
4. **Memoizable** - Can cache results
5. **Parallelizable** - Safe to run concurrently
6. **Predictable** - Same inputs = same outputs, always
7. **Debuggable** - Easy to reason about
8. **Maintainable** - Clear, focused functions

## Next: Phase 3

Phase 3 will create **Services** that wrap **Actions** (side effects):

```typescript
// Service uses calculations for business logic
export class TaskQueryService extends Effect.Service<TaskQueryService>() {
  static get = Effect.gen(function* (_) {
    const repo = yield* _(TaskRepository);
    
    return {
      getOverdueTasks: Effect.gen(function* (_) {
        const tasks = yield* _(repo.getAllTasks());
        const today = new Date().toISOString();
        
        // Uses pure calculation!
        return tasks.filter(t => isTaskOverdue(t, today));
      })
    };
  });
}
```

Services will handle:
- Database I/O
- Error handling
- Side effects
- Dependency injection

While delegating business logic to these pure calculations!

## Summary

Phase 2 transforms scattered, mixed-concern code into a **clean calculation layer** with 45+ pure functions. The foundation for testable, maintainable business logic is now in place! 🎉
