import { v4 as uuidv4 } from "uuid";
import { UndoMove } from "./UndoMove";
import { Task } from "./Task";
import { UndoCreate } from "./UndoCreate";
import { UndoDelete } from "./UndoDelete";
import { UndoUpdate } from "./UndoUpdate";
import { UndoState } from "./UndoState";

export type TaskID = ReturnType<typeof uuidv4>;

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
export class UndoService implements IUndo {
  constructor(
    public type: string,
    public task: Task,
    private readonly undoList: Array<UndoService> = []
  ) {}

  async undoItem(): Promise<Boolean> {
    const current: UndoService = this.undoList.shift();
    return await current.undo();
  }

  async undo(): Promise<Boolean> {
    console.log("well, your mom"); // got'em
    return true;
  }

  async addUndoItem(
    task: Task,
    parentId: TaskID,
    type: UndoStates
  ): Promise<Boolean> {
    const taskCopy: Task = new Task(
      task.id,
      task.text,
      task.state,
      task.subTaskIds
    );

    let item: UndoService;

    switch (type) {
      case UndoStates.MOVE: {
        item = new UndoMove(taskCopy, parentId);
        break;
      }
      case UndoStates.STATECHANGE: {
        item = new UndoState(taskCopy);
        break;
      }
      case UndoStates.ATTRIBUTECHANGE: {
        item = new UndoUpdate(taskCopy);
        break;
      }
      case UndoStates.CREATE: {
        item = new UndoCreate(taskCopy);
        break;
      }
      case UndoStates.DELETE: {
        item = new UndoDelete(taskCopy, parentId);
        break;
      }
    }
    this.undoList.push(item);
    return true;
  }
}
