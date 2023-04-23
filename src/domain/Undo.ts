import { v4 as uuidv4 } from "uuid";
import { Task } from "./Task";

type TaskID = ReturnType<typeof uuidv4>;

export enum UndoStates {
  CREATE = "CREATED",
  DELETE = "DELETED",
  MOVE = "MOVED",
  STATECHANGE = "CHANGEDSTATE",
  ATTRIBUTECHANGE = "ATTRIBUTECHANGED",
}

export interface IUndo {
  type: string;
  task: Task;
}
export class Undo implements IUndo {
  constructor(public type: UndoStates, public task: Task) {}

  async undo(): Promise<Boolean> {
    console.log("well, your mom"); // got'em
    return true;
  }
}
