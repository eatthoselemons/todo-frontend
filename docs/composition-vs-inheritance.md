# Composition vs Inheritance in Effect.Schema

## What I Did (Class-Based Schema)

```typescript
export class TaskIdSchema extends Schema.String.pipe(
  Schema.pattern(/^[uuid-pattern]$/),
  Schema.brand("TaskId")
) {}
```

**This LOOKS like inheritance**, but it's actually Effect.Schema's way of creating a **named, reusable schema class**.

## The Question: Is This Inheritance?

**Short answer:** It's syntactically inheritance, but semantically it's **schema definition**, not OOP inheritance.

### Why Effect Uses This Pattern

1. **Type inference** - Better TypeScript type inference
2. **Named types** - Shows up as `TaskIdSchema` in error messages
3. **Reusability** - Can extend/compose further
4. **Documentation** - Self-documenting schema name

### However, You're Right to Question It!

In **pure functional programming**, we prefer **composition over inheritance**. Let's explore alternatives.

## Pure Composition Approach

```typescript
import { Schema, pipe } from "effect";

// Pure composition - no classes!
export const TaskIdSchema = pipe(
  Schema.String,
  Schema.pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  Schema.brand("TaskId")
);

export type TaskId = Schema.Schema.Type<typeof TaskIdSchema>;
export const makeTaskId = Schema.decodeUnknownSync(TaskIdSchema);
```

**Benefits:**
- ✅ Pure composition (no inheritance)
- ✅ Functional style
- ✅ No class syntax
- ✅ Still type-safe

**Drawbacks:**
- ❌ Slightly worse type inference in some cases
- ❌ Error messages show `(String <-> TaskId)` instead of `TaskIdSchema`

## Comparison

### Class-Based (Current)
```typescript
export class TaskIdSchema extends Schema.String.pipe(
  Schema.pattern(/^[uuid]$/),
  Schema.brand("TaskId")
) {}

// Error message:
// Type 'string' is not assignable to type 'TaskIdSchema'
```

### Pure Composition
```typescript
export const TaskIdSchema = pipe(
  Schema.String,
  Schema.pattern(/^[uuid]$/),
  Schema.brand("TaskId")
);

// Error message:
// Type 'string' is not assignable to type 'string & Brand<"TaskId">'
```

### Function-Based Composition
```typescript
// Even more compositional!
const uuid = () => Schema.String.pipe(
  Schema.pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
);

const branded = (brand: string) => <A>(schema: Schema.Schema<A, unknown, unknown>) =>
  schema.pipe(Schema.brand(brand));

export const TaskIdSchema = pipe(
  uuid(),
  branded("TaskId")
);
```

## Effect's Recommendation

From Effect documentation, **both are valid**:

1. **Class-based** - For public APIs, libraries, reusable schemas
2. **Const-based** - For internal schemas, one-off validations

## Which Should We Use?

### For Domain Value Objects: **Composition** ✅

Since we're following DDD and functional programming:

```typescript
// Composition over inheritance
export const TaskIdSchema = Schema.String.pipe(
  Schema.pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  Schema.brand("TaskId")
);

export const TaskTextSchema = Schema.String.pipe(
  Schema.minLength(1),
  Schema.maxLength(500),
  Schema.brand("TaskText")
);

export const TaskPathSchema = Schema.Array(TaskIdSchema).pipe(
  Schema.brand("TaskPath")
);
```

**Why this is better:**
- ✅ No class inheritance
- ✅ Pure composition with `pipe`
- ✅ Functional style
- ✅ Easier to understand
- ✅ Follows "composition over inheritance" principle

## Advanced Composition Example

```typescript
import { Schema, pipe } from "effect";

// Composable primitives
const nonEmpty = <A extends string>() => 
  Schema.String.pipe(Schema.minLength(1));

const maxLength = (n: number) => 
  Schema.String.pipe(Schema.maxLength(n));

const brand = <B extends string>(name: B) => 
  <A>(schema: Schema.Schema<A>) => schema.pipe(Schema.brand(name));

// Compose them!
export const TaskTextSchema = pipe(
  Schema.String,
  Schema.minLength(1),
  Schema.maxLength(500),
  Schema.brand("TaskText")
);

// Or even more compositional:
const bounded = (min: number, max: number) =>
  Schema.String.pipe(Schema.minLength(min), Schema.maxLength(max));

export const TaskTextSchema = pipe(
  bounded(1, 500),
  brand("TaskText")
);
```

## Recommendation: Refactor to Composition

Let's remove the `class` syntax and use pure `pipe` composition:

```typescript
// ❌ Inheritance-style (current)
export class TaskIdSchema extends Schema.String.pipe(...) {}

// ✅ Composition-style (better)
export const TaskIdSchema = Schema.String.pipe(...);
```

This aligns better with:
- Functional programming principles
- "Composition over inheritance" (Gang of Four, Grokking Simplicity)
- Effect's functional nature
- TypeScript's structural typing

Should I refactor to pure composition?
