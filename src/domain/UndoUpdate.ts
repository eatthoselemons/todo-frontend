import { Undo, TaskID, UndoStates } from "./Undo";
import { v4 as uuidv4 } from "uuid";
import { createTask, deleteTask } from "../service/TaskService";
import { BaseStates, Task } from "./Task";

export class UndoUpdate extends Undo {
    constructor(
        public type: string = UndoStates.ATTRIBUTECHANGE,
        public readonly id: TaskID,

        public state: string,
        public text: string,
        super(this.type, this.id);
) {}

async undo(): Promise<Boolean> {
    await updateTask(this.task, this.parentId);
    return true;
}
}
