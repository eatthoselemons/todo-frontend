# Theme Event System (Emittery)

The theme system uses [Emittery](https://github.com/sindresorhus/emittery) for a robust, type-safe event-driven architecture.

## Overview

All theme effects are triggered through the `ThemeEventBus`, which provides:
- **Type-safe events** - TypeScript ensures correct event payloads
- **Async/await support** - Handlers can be async
- **Unsubscribe pattern** - Easy cleanup
- **Filtering & waiting** - Advanced event handling
- **No memory leaks** - Proper cleanup on unmount

## Basic Usage

### Emitting Events

```typescript
import { useRewardsContext } from '../context/RewardsContext';

function TaskItem({ task }) {
  const { emit, emitSync } = useRewardsContext();

  const handleComplete = async () => {
    // Emit and wait for all handlers
    await emit('task:complete', {
      taskId: task.id,
      isRoot: task.parentId === ROOT_ID,
      clientPos: { x: event.clientX, y: event.clientY },
      targetElement: event.currentTarget as HTMLElement,
    });
  };

  const handleCreate = () => {
    // Emit without waiting (fire-and-forget)
    emitSync('task:create', {
      taskId: newTask.id,
    });
  };

  return (
    <button onClick={handleComplete}>Complete</button>
  );
}
```

### Listening to Events

```typescript
import { useEffect } from 'react';
import { useRewardsContext } from '../context/RewardsContext';

function ParticleRenderer() {
  const { on } = useRewardsContext();

  useEffect(() => {
    // Subscribe to particle events
    const unsubscribe = on('theme:particle', (data) => {
      // Render particles
      renderParticles(data.kind, data.count, data.origin);
    });

    // Cleanup on unmount
    return () => unsubscribe();
  }, [on]);

  return <canvas />;
}
```

### Using Once (Promises)

```typescript
import { useRewardsContext } from '../context/RewardsContext';

async function waitForMilestone() {
  const { once } = useRewardsContext();

  // Wait for next milestone event
  const data = await once('milestone');
  console.log(`Milestone: ${data.label} - ${data.value}%`);
}
```

## Available Events

### Task Events

#### `task:complete`
Emitted when a task is completed.

```typescript
emit('task:complete', {
  taskId: string;
  isRoot?: boolean;
  clientPos?: { x: number; y: number };
  targetElement?: HTMLElement;
});
```

#### `task:create`
Emitted when a new task is created.

```typescript
emit('task:create', {
  taskId: string;
  clientPos?: { x: number; y: number };
});
```

#### `task:delete`
Emitted when a task is deleted.

```typescript
emit('task:delete', {
  taskId: string;
});
```

#### `branch:complete`
Emitted when all subtasks of a parent are completed.

```typescript
emit('branch:complete', {
  taskId: string;
  clientPos?: { x: number; y: number };
  targetElement?: HTMLElement;
});
```

### Progress Events

#### `milestone`
Emitted on significant progress milestones.

```typescript
emit('milestone', {
  label: string;
  value: number;
});
```

### Effect Events

#### `theme:particle`
Emitted by the EffectsEngine to trigger particle effects.

```typescript
on('theme:particle', (data) => {
  // data.kind: 'confetti' | 'bubbles' | 'sparks' | 'sparkles'
  // data.count: number
  // data.origin?: { x: number; y: number }
  // data.colorSet?: string[]
});
```

## Advanced Patterns

### Filtering Events

```typescript
import { themeEventBus } from '../services/ThemeEventBus';

// Wait for a specific task to complete
const data = await themeEventBus.waitFor('task:complete', {
  filter: (d) => d.taskId === 'specific-task-123',
  timeout: 5000, // optional timeout in ms
});
```

### Listening to All Events

```typescript
import { themeEventBus } from '../services/ThemeEventBus';

const unsubscribe = themeEventBus.onAny((eventType, data) => {
  console.log(`Event: ${eventType}`, data);

  if (eventType === 'task:complete') {
    // Handle task completion
  }
});
```

### Conditional Effects

```typescript
function SmartEffects() {
  const { on, settings } = useRewardsContext();

  useEffect(() => {
    const unsubscribe = on('task:complete', async (data) => {
      // Only trigger effects for root tasks
      if (data.isRoot && settings.intensity !== 'none') {
        await triggerCelebration(data);
      }
    });

    return () => unsubscribe();
  }, [on, settings]);
}
```

### Debouncing Events

```typescript
import { debounce } from 'lodash';

function DebouncedListener() {
  const { on } = useRewardsContext();

  useEffect(() => {
    const debouncedHandler = debounce((data) => {
      console.log('Task completed:', data.taskId);
    }, 500);

    const unsubscribe = on('task:complete', debouncedHandler);

    return () => {
      unsubscribe();
      debouncedHandler.cancel();
    };
  }, [on]);
}
```

### Error Handling

```typescript
const { on } = useRewardsContext();

useEffect(() => {
  const unsubscribe = on('task:complete', async (data) => {
    try {
      await performAsyncOperation(data);
    } catch (error) {
      console.error('Handler failed:', error);
      // Handler errors won't break other listeners
    }
  });

  return () => unsubscribe();
}, [on]);
```

## Testing Events

### Emitting Events in Tests

```typescript
import { themeEventBus } from '../services/ThemeEventBus';

test('should handle task completion', async () => {
  const handler = jest.fn();
  themeEventBus.on('task:complete', handler);

  await themeEventBus.emit('task:complete', { taskId: 'test-123' });

  expect(handler).toHaveBeenCalledWith({ taskId: 'test-123' });
});
```

### Waiting for Events in Tests

```typescript
test('should emit milestone event', async () => {
  const promise = themeEventBus.once('milestone');

  // Trigger action that emits milestone
  await completeTask();

  const data = await promise;
  expect(data.label).toBe('Level 5!');
});
```

### Cleaning Up in Tests

```typescript
beforeEach(() => {
  themeEventBus.clearListeners();
});

afterEach(() => {
  themeEventBus.clearListeners();
});
```

## Best Practices

1. **Always unsubscribe** - Use the unsubscribe function in cleanup
2. **Use emitSync for fire-and-forget** - Don't block UI with await
3. **Keep handlers focused** - One handler, one responsibility
4. **Handle errors gracefully** - Wrap async code in try/catch
5. **Test event flows** - Verify events are emitted and handled correctly
6. **Use TypeScript** - Let the type system catch errors early

## Performance Tips

- Use `emitSync` for non-critical effects to avoid blocking
- Debounce high-frequency events
- Unsubscribe when components unmount
- Keep event payloads small
- Batch multiple emissions when possible

## Migration from Old System

### Before (triggerEffect)
```typescript
await triggerEffect({
  type: 'task:complete',
  taskId: 'task-123',
  isRoot: true,
});
```

### After (emit)
```typescript
await emit('task:complete', {
  taskId: 'task-123',
  isRoot: true,
});
```

The new system is more flexible, type-safe, and allows for custom event handlers beyond just theme effects.
