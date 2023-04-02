import { Undo, TaskID, Undo, UndoStates } from "./Undo";
import { v4 as uuidv4 } from "uuid";
import { deleteTask } from "../service/TaskService";

export class UndoCreate extends Undo {
  constructor(
    public type: string = UndoStates.CREATE,
    public readonly id: TaskID

    super(this.type, this.id);
  ) {}

  async undo(): Promise<Boolean> {
    await deleteTask(this.id);
    return true;
  }
}
