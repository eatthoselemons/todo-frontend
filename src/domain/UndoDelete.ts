import { TaskID, UndoService, UndoStates } from "./UndoService";
import { v4 as uuidv4 } from "uuid";
import { createTask, deleteTask } from "../service/TaskService";
import { BaseStates, Task } from "./Task";

export class UndoDelete extends UndoService {
  constructor(
    public task: Task,
    public parentId: TaskID,
    public type: string = UndoStates.DELETE
  ) {
    super(type, task);
  }

  async undo(): Promise<Boolean> {
    await createTask(this.task, this.parentId);
    return true;
  }
}
