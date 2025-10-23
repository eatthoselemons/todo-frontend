# Phase 4: Hooks Migration Guide

## ✅ Completed

Phase 4 refactors the React hooks layer to use the new Effect-based services architecture.

## New Hooks Created

### Core Hooks

1. **`useTaskServices`** - Initializes Effect runtime with services
   - Sets up the service layer with PouchDB
   - Creates managed runtime for Effect execution
   - Provides `isReady` flag for loading states

2. **`useTaskQueries`** - Read operations (queries)
   - All query operations from old useTaskHooks
   - Returns Promises for React compatibility
   - Uses Effect services under the hood

3. **`useTaskCommands`** - Write operations (commands)
   - All command operations from old useTaskHooks
   - Returns Promises for React compatibility
   - Uses Effect services under the hood

4. **`useTaskOperations`** - Combined hook (drop-in replacement)
   - Combines queries + commands
   - Direct replacement for old useTaskHooks
   - Maintains backward compatibility

## Migration Path

### Old Code (useTaskHooks)

```typescript
import useTaskHooks from "../hooks/useTaskHooks";

const MyComponent = () => {
  const tasks = useTaskHooks();

  useEffect(() => {
    tasks.getAllTasks().then(setTasks);
  }, []);

  const handleCreate = async () => {
    const newTask = new Task("My task", BaseState.NOT_STARTED);
    await tasks.createTask(newTask);
  };

  return <div>...</div>;
};
```

### New Code (useTaskOperations)

```typescript
import { useTaskOperations } from "@/features/tasks/hooks";

const MyComponent = () => {
  const tasks = useTaskOperations();

  useEffect(() => {
    if (!tasks.isReady) return;
    tasks.getAllTasks().then(setTasks);
  }, [tasks.isReady]);

  const handleCreate = async () => {
    await tasks.createTask({
      text: "My task",
      parentId: ROOT_TASK_ID,
    });
  };

  return <div>...</div>;
};
```

## API Changes

### Query Operations (No Breaking Changes)

All query operations maintain the same signature:

- ✅ `getAllTasks()` - Same
- ✅ `getTask(id)` - Same
- ✅ `getRootTasks()` - Same
- ✅ `getImmediateChildren(parentId)` - Same
- ✅ `getSubtree(taskId)` - Same

**New operations added:**
- `getTaskTree(rootId)` - Get hierarchical tree
- `getRootTaskForest()` - Get all root trees
- `getOverdueTasks(date)` - Filter overdue
- `getTasksByState(state)` - Filter by state
- `searchTasks(query)` - Text search

### Command Operations (Minor Changes)

**createTask:**
```typescript
// Old
const task = new Task("text", BaseState.NOT_STARTED);
await tasks.createTask(task, parentId);

// New
await tasks.createTask({
  text: "text",
  parentId: parentId,
  dueDate: "2024-12-31" // optional
});
```

**moveTask:**
```typescript
// Old
await tasks.moveTask(childTask, newParentTask);

// New
await tasks.moveTask(childTask.id, newParentTask.id);
```

**Other commands** (unchanged):
- ✅ `deleteTask(id)` - Same
- ✅ `updateTask(task)` - Same (maps to updateTaskText internally)

**New commands added:**
- `updateTaskText(id, text)` - Update text only
- `transitionTaskState(id, state)` - Change state
- `completeTask(id)` - Mark as done
- `setTaskDueDate(id, date)` - Set due date
- `clearSubtasks(id)` - Delete children only

## Architecture Benefits

### Before (Old useTaskHooks)
```
useTaskHooks → PouchDB directly
```
- Mixed business logic with DB operations
- No proper error typing
- Hard to test
- No separation of concerns

### After (New useTaskOperations)
```
useTaskOperations → Effect Services → Repository → PouchDB
```
- ✅ Business logic in services
- ✅ Typed errors (NotFoundError, DbError, etc.)
- ✅ Easy to test (mock services)
- ✅ Clear separation of concerns
- ✅ Efficient DB queries (views)
- ✅ Type-safe throughout

## Testing Strategy

### Old Hook Testing
```typescript
// Had to mock PouchDB directly
const mockDb = {
  get: jest.fn(),
  put: jest.fn(),
  // ...
};
```

### New Hook Testing
```typescript
// Mock at service layer (clean, high-level)
const mockQueries: TaskQueryService = {
  getAllTasks: () => Effect.succeed([mockTask]),
  getTask: (id) => Effect.succeed(mockTask),
  // ...
};
```

## Next Steps

### Phase 5: Application Layer (Use Cases)
- Compose services into high-level use cases
- Add event handling
- Connect to rewards system

### Phase 6: UI Layer Updates
- Update components to use new hooks
- Add error boundaries
- Show loading states
- Implement optimistic updates

## Status

- ✅ Build: Passing
- ✅ Tests: 168/177 passing (same as before)
- ✅ All hooks created and exported
- ✅ Drop-in replacement ready
- 🔄 Next: Migrate components to use new hooks
