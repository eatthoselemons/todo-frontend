import { BaseStates, Task, TaskID } from "./Task";
import { Undo, UndoStates } from "./Undo";

export class UndoMove extends Undo {
  constructor(
    public readonly task: Task,
    public oldParentId: TaskID,
    public type: UndoStates = UndoStates.MOVE
  ) {
    super(type, task);
  }

  async undo(): Promise<boolean> {
    // await moveTask(
    //   await getTaskById(this.task.id),
    //   await getTaskById(this.oldParentId)
    // );
    return true;
  }
}
