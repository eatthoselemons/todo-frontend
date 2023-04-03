import { UndoService, TaskID, UndoStates } from "./UndoService";
import { v4 as uuidv4 } from "uuid";
import {
  createTask,
  deleteTask,
  taskStateChange,
  updateTask,
} from "../service/TaskService";
import { BaseStates, Task } from "./Task";

export class UndoUpdate extends UndoService {
  constructor(
    public readonly task: Task,

    public type: string = UndoStates.ATTRIBUTECHANGE
  ) {
    super(type, task);
  }

  async undo(): Promise<Boolean> {
    await taskStateChange(this.task.id, this.task.state);
    return true;
  }
}
