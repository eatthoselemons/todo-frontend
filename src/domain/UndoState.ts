import { TaskID, UndoService, UndoStates } from "./UndoService";
import { v4 as uuidv4 } from "uuid";
import { deleteTask } from "../service/TaskService";
import { Task } from "./Task";

export class UndoState extends UndoService {
  constructor(
    public readonly task: Task,
    public type: string = UndoStates.CREATE
  ) {
    super(type, task);
  }

  async undo(): Promise<Boolean> {
    await this.task.id;
    return true;
  }
}
