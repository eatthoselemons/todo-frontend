import { Undo, TaskID, Undo, UndoStates } from "./Undo";
import { v4 as uuidv4 } from "uuid";
import { createTask, deleteTask } from "../service/TaskService";
import { BaseStates, Task } from "./Task";

export class UndoDelete extends Undo {
  constructor(
    public type: string = UndoStates.DELETE,
    public readonly id: TaskID

    public task: Task,
    public parentId: TaskID
    super(this.type, this.id);
  ) {}

  async undo(): Promise<Boolean> {
    await createTask(this.task, this.parentId);
    return true;
  }
}
