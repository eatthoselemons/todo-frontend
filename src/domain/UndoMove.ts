import { UndoService, TaskID, UndoStates } from "./UndoService";
import { v4 as uuidv4 } from "uuid";
import {
  createTask,
  deleteTask,
  getTaskById,
  moveTask,
} from "../service/TaskService";
import { BaseStates, Task } from "./Task";

export class UndoMove extends UndoService {
  constructor(
    public readonly task: Task,
    public oldParentId: TaskID,
    public type: string = UndoStates.MOVE
  ) {
    super(type, task);
  }

  async undo(): Promise<Boolean> {
    await moveTask(
      await getTaskById(this.task.id),
      await getTaskById(this.oldParentId)
    );
    return true;
  }
}
