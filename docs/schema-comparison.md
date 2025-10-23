# Effect.Schema Branded Types - Comparison

## What I Did (Mixed Approach)

```typescript
import { Schema } from "effect";
import { Brand } from "effect";

// Type definition using Brand
export type TaskId = string & Brand.Brand<"TaskId">;

// Runtime constructor using Brand
export const TaskId = Brand.nominal<TaskId>();

// Separate Schema definition
export const TaskIdSchema = Schema.String.pipe(
  Schema.brand("TaskId"),
  Schema.pattern(/^[0-9a-f]{8}-.../)
);

// Usage - two separate concerns
const id = TaskId("some-uuid"); // No validation!
const validated = Schema.decodeSync(TaskIdSchema)("some-uuid"); // With validation
```

**Problems:**
- ❌ Duplicated definitions (type + schema)
- ❌ `TaskId()` constructor doesn't validate
- ❌ Two ways to create the same type
- ❌ Schema and Brand are separate

## What I Should Do (Schema-First)

```typescript
import { Schema } from "effect";

// Define Schema - this creates BOTH type and validation
export class TaskIdSchema extends Schema.String.pipe(
  Schema.pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  Schema.brand("TaskId")
) {}

// Extract the type from the Schema
export type TaskId = Schema.Schema.Type<typeof TaskIdSchema>;

// Create decoder (validates automatically)
export const makeTaskId = Schema.decodeUnknownSync(TaskIdSchema);

// For constants where you know it's valid
export const unsafeTaskId = (s: string): TaskId => s as TaskId;

export const ROOT_TASK_ID: TaskId = unsafeTaskId("db62a329-39d4-44b1-816c-5eb5c2e30a27");
```

**Benefits:**
- ✅ Single source of truth
- ✅ Type derived from Schema
- ✅ Always validated when using `makeTaskId`
- ✅ Schema is the branded type

## Usage Comparison

### Mixed Approach (Current)
```typescript
import { TaskId, TaskIdSchema, makeTaskId } from "./ValueObjects";

// Confusing - which one to use?
const id1 = TaskId("abc"); // No validation!
const id2 = makeTaskId("abc"); // With validation
const id3 = Schema.decodeSync(TaskIdSchema)("abc"); // Also validates?
```

### Schema-First Approach (Better)
```typescript
import { TaskId, TaskIdSchema, makeTaskId } from "./ValueObjects.v2";

// Clear - one way to create with validation
const id = makeTaskId("abc-def-..."); // Validates!

// For constants only
const ROOT = unsafeTaskId("known-valid-uuid");

// For Effect pipelines
const program = Effect.gen(function* (_) {
  const decoded = yield* _(Schema.decode(TaskIdSchema)("some-string"));
  // decoded is TaskId type
});
```

## Full Example: TaskText

### Schema-First Way
```typescript
// Define Schema class
export class TaskTextSchema extends Schema.String.pipe(
  Schema.minLength(1),
  Schema.maxLength(500),
  Schema.brand("TaskText")
) {}

// Extract type
export type TaskText = Schema.Schema.Type<typeof TaskTextSchema>;

// Create validated constructor
export const makeTaskText = Schema.decodeUnknownSync(TaskTextSchema);

// Usage
try {
  const text = makeTaskText("Hello"); // ✅ Valid
  const bad = makeTaskText(""); // ❌ Throws ParseError
} catch (error) {
  console.error("Invalid task text");
}
```

### With Effect (No Exceptions)
```typescript
import { Effect } from "effect";

const program = Effect.gen(function* (_) {
  // Decode returns Effect<TaskText, ParseError>
  const text = yield* _(Schema.decode(TaskTextSchema)(userInput));
  
  return text;
});

// Handle errors functionally
const result = await Effect.runPromise(
  program.pipe(
    Effect.catchAll(error => {
      console.error("Validation failed:", error);
      return Effect.succeed(defaultText);
    })
  )
);
```

## Why Schema-First is Better

### 1. Single Source of Truth
```typescript
// Schema defines EVERYTHING
export class EmailSchema extends Schema.String.pipe(
  Schema.pattern(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/),
  Schema.brand("Email")
) {}

// Type automatically correct
export type Email = Schema.Schema.Type<typeof EmailSchema>;
```

### 2. Built-in Validation
```typescript
// Every creation goes through validation
const makeEmail = Schema.decodeUnknownSync(EmailSchema);

makeEmail("user@example.com"); // ✅
makeEmail("not-an-email"); // ❌ ParseError
```

### 3. Composability
```typescript
// Combine schemas easily
export class UserSchema extends Schema.Struct({
  id: UserIdSchema,
  email: EmailSchema,
  name: NonEmptyStringSchema,
}) {}

// Type is automatically inferred
export type User = Schema.Schema.Type<typeof UserSchema>;
```

### 4. Serialization/Deserialization
```typescript
// From JSON
const userFromJson = Schema.decodeSync(UserSchema)(jsonData);

// To JSON
const jsonData = Schema.encodeSync(UserSchema)(user);
```

## Should I Refactor?

**Yes!** Using Schema-first approach gives us:
- ✅ Less code
- ✅ Single source of truth
- ✅ Better DX (developer experience)
- ✅ Automatic serialization
- ✅ Better Effect integration
- ✅ Composable schemas

**Migration is easy:**
1. Convert each branded type to Schema class
2. Update imports
3. Use `makeX` helpers consistently
4. Remove old `Brand.nominal/refined` code

Would you like me to do this refactor now?
