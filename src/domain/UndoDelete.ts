import { BaseState, Task, TaskID } from "./Task";
import { Undo, UndoStates } from "./Undo";

export class UndoDelete extends Undo {
  constructor(
    public task: Task,
    public parentId: TaskID,
    public type: UndoStates = UndoStates.DELETE
  ) {
    super(type, task);
  }

  async undo(): Promise<Boolean> {
    // await createTask(this.task, this.parentId);
    return true;
  }
}
