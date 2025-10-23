/**
 * YAML Schema and Types
 * Defines the schema for YAML task import/export with validation
 */

import { Schema } from "effect";
import { TaskState, TaskStateSchema } from "../domain/TaskState";

/**
 * YAML representation of a task (simplified, no internal metadata)
 */
export const YamlTaskSchema: Schema.Schema<any> = Schema.Struct({
  id: Schema.optional(Schema.String),
  text: Schema.String,
  state: Schema.optional(TaskStateSchema),
  dueDate: Schema.optional(Schema.String),
  children: Schema.optional(Schema.Array(Schema.suspend(() => YamlTaskSchema))),
});

export type YamlTask = {
  id?: string;
  text: string;
  state?: TaskState;
  dueDate?: string;
  children?: YamlTask[];
};

/**
 * Result of parsing YAML import
 */
export interface YamlParseResult {
  updatedTask: {
    text: string;
    state?: TaskState;
    dueDate?: string;
  };
  childrenToCreate: Array<YamlChildToCreate>;
  childrenToUpdate: Array<YamlChildToUpdate>;
  childrenToDelete: string[];
}

export interface YamlChildToCreate {
  text: string;
  state?: TaskState;
  dueDate?: string;
  children?: YamlChildToCreate[];
}

export interface YamlChildToUpdate {
  id: string;
  updates: {
    text: string;
    state?: TaskState;
    dueDate?: string;
  };
  children?: YamlChildToCreate[];
}

/**
 * Errors that can occur during YAML operations
 */
export class YamlParseError {
  readonly _tag = "YamlParseError";
  constructor(readonly message: string) {}
}

export class YamlValidationError {
  readonly _tag = "YamlValidationError";
  constructor(readonly message: string) {}
}
