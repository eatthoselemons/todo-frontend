import { Task } from "./Task";
import { Undo, UndoStates } from "./Undo";

export class UndoState extends Undo {
  constructor(
    public readonly task: Task,
    public type: UndoStates = UndoStates.CREATE
  ) {
    super(type, task);
  }

  async undo(): Promise<Boolean> {
    await this.task.id;
    return true;
  }
}
