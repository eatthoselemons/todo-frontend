# Instructions for AI Agents

## Project Overview

This is a todo app being refactored to follow **Domain-Driven Design**, **Grokking Simplicity**, and **Effect-TS** patterns.

## Architecture Principles (CRITICAL!)

**READ `ARCHITECTURE.md` FIRST** - It contains all the design principles and patterns we follow.

Key rules:
1. **Composition over inheritance** - Use `const` + `pipe`, never `class extends`
2. **Schema-first** - Define Schema, extract type, create constructor
3. **No primitive obsession** - All primitives wrapped in branded types
4. **Immutability** - Never mutate, always return new instances
5. **Pure calculations** - Separate from actions (side effects)
6. **Effect for I/O** - All side effects wrapped in Effect
7. **Pipe composition** - Never use `Effect.gen`, always use `pipe`

## Current State

### ✅ Completed (Phases 1-3)

**Phase 1: Domain Layer** (`src/features/tasks/domain/`)
- Value objects: TaskId, TaskText, TaskPath, Timestamp, DueDate (all branded)
- TaskState: Discriminated union
- Task entity: Immutable
- Domain events: TaskCreated, TaskCompleted, etc.

**Phase 2: Calculations Layer** (`src/features/tasks/calculations/`)
- 45+ pure functions
- PathCalculations, TaskCalculations, TreeCalculations, ProgressCalculations
- Zero side effects

**Phase 3: Service & Repository Layer**
- Infrastructure (`src/features/tasks/infrastructure/`):
  - TaskRepository interface
  - PouchDBAdapter implementation
  - Typed errors (NotFoundError, DbError, etc.)
- Services (`src/features/tasks/services/`):
  - TaskQueryService (9 read operations)
  - TaskCommandService (8 write operations)

### 🔄 In Progress

**Phase 4-6**: Migrate old code to use new architecture
- Old: `src/hooks/useTaskHooks.ts` (moved to `src/features/tasks/hooks/`)
- New: Use services from Phase 3
- Keep backward compatibility during migration

## File Structure

```
src/features/tasks/
├── domain/              # Phase 1 ✅
│   ├── ValueObjects.ts
│   ├── TaskState.ts
│   ├── TaskEntity.ts
│   ├── DomainEvents.ts
│   └── index.ts
├── calculations/        # Phase 2 ✅
│   ├── PathCalculations.ts
│   ├── TaskCalculations.ts
│   ├── TreeCalculations.ts
│   ├── ProgressCalculations.ts
│   └── index.ts
├── infrastructure/      # Phase 3 ✅
│   ├── errors.ts
│   ├── TaskRepository.ts
│   ├── PouchDBAdapter.ts
│   └── index.ts
├── services/           # Phase 3 ✅
│   ├── TaskQueryService.ts
│   ├── TaskCommandService.ts
│   └── index.ts
└── hooks/              # Legacy (being migrated)
    ├── useTaskHooks.ts
    ├── useYamlExport.ts
    └── useTaskWatcher.tsx
```

## Code Style Rules

### ALWAYS Use Pipe Composition

```typescript
// ✅ CORRECT
return pipe(
  repo.getById(id),
  Effect.map((task) => transform(task)),
  Effect.flatMap((result) => repo.save(result))
);

// ❌ NEVER USE Effect.gen
return Effect.gen(function* (_) {
  const task = yield* _(repo.getById(id));
  // ...
});
```

### ALWAYS Use Schema-First

```typescript
// ✅ CORRECT
export const TaskIdSchema = Schema.String.pipe(...);
export type TaskId = Schema.Schema.Type<typeof TaskIdSchema>;

// ❌ NEVER separate type and schema
export type TaskId = string & Brand.Brand<"TaskId">;
export const TaskIdSchema = Schema.String.pipe(...);
```

### ALWAYS Use Pure Composition

```typescript
// ✅ CORRECT
export const XSchema = Schema.Y.pipe(...);

// ❌ NEVER use extends
export class XSchema extends Schema.Y.pipe(...) {}
```

## Commands

```bash
# Build (ALWAYS run after changes)
npm run build

# Tests (168 passing, 9 pre-existing failures)
npm test

# Type check
npx tsc --noEmit
```

## When Making Changes

1. **Read ARCHITECTURE.md** to understand principles
2. **Check docs/todo.md** to see the refactoring plan
3. **Follow the layering**: Domain → Calculations → Repository → Services
4. **Use pure composition**: `pipe`, not `class extends` or `Effect.gen`
5. **Test calculations** with pure data (no mocks)
6. **Test services** by mocking repository
7. **Run build** to verify no errors

## Important Files

- `ARCHITECTURE.md` - **READ THIS FIRST**
- `docs/todo.md` - Full refactoring plan
- `docs/phase1-summary.md` - Domain layer
- `docs/phase2-summary.md` - Calculations layer
- `docs/phase3-summary.md` - Services layer
- `docs/composition-vs-inheritance.md` - Why composition
- `docs/architecture-layers.md` - Layer separation

## Do NOT

- ❌ Use `class ... extends` (inheritance)
- ❌ Use `Effect.gen` (causes type errors)
- ❌ Use primitive types in domain (`string`, `number`)
- ❌ Mutate objects
- ❌ Mix I/O and logic in same function
- ❌ Use Date.now() inside calculations
- ❌ Throw exceptions (use Effect.fail)

## DO

- ✅ Use `pipe` for composition
- ✅ Use Schema-first branded types
- ✅ Make everything immutable
- ✅ Separate calculations from actions
- ✅ Pass time as parameters
- ✅ Use Effect for I/O
- ✅ Use discriminated unions
- ✅ Test with pure data

---

**Status**: Phase 3 complete, ready for Phase 4 (migration)
**Build**: ✅ Passing
**Tests**: ✅ 168/177 passing
