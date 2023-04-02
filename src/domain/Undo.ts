import { v4 as uuidv4 } from "uuid";
import { deleteTask, getTaskById } from "../service/TaskService";
import { UndoMove } from "./UndoMove";

export type TaskID = ReturnType<typeof uuidv4>;

export enum UndoStates {
  CREATE = "CREATED",
  DELETE = "DELEATED",

  MOVE = "MOVED",
  STATECHANGE = "CHANGEDSTATE",
  ATTRIBUTECHANGE = "ATTRIBUTECHANGED",
}

export interface IUndo {
  type: string;
  id: TaskID;
}
export class Undo implements IUndo {
  constructor(
    public type: string,
    public readonly id: TaskID,
    private undoList: Array<Undo>
  ) {}

  async undoItem(): Promise<Boolean> {
    const current: Undo = this.undoList.shift();
    current.undo();
    return true;
  }

  async addUndoItem(id: TaskID, type: UndoStates): Promise<Boolean> {
    current = getTaskById(id);
    switch (type) {
      case UndoStates.ATTRIBUTECHANGE: {
        const item = new UndoMove();
      }
    }
    this.undoList.push();
  }
}
