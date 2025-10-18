import { BaseState, Task } from "./Task";
import { Undo, UndoStates } from "./Undo";

export class UndoUpdate extends Undo {
  constructor(
    public readonly task: Task,
    public type: UndoStates = UndoStates.ATTRIBUTECHANGE
  ) {
    super(type, task);
  }

  async undo(): Promise<Boolean> {
    // await taskStateChange(this.task.id, this.task.state);
    return true;
  }
}
