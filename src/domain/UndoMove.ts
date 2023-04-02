import { Undo, TaskID, UndoStates } from "./Undo";
import { v4 as uuidv4 } from "uuid";
import {createTask, deleteTask, getTaskById} from "../service/TaskService";
import { BaseStates, Task } from "./Task";

export class UndoMove extends Undo {
    constructor(
        public type: string = UndoStates.MOVE,
        public readonly id: TaskID,

        public oldParentId: TaskID,
        public text: string,
    super(this.type, this.id);
) {}

async undo(): Promise<Boolean> {
    await moveTask(getTaskById(this.id), getTaskById(this.oldParentId));
    return true;
}
}
