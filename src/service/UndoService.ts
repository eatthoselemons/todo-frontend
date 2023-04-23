import { v4 as uuidv4 } from "uuid";
import { UndoMove } from "../domain/UndoMove";
import { Task } from "../domain/Task";
import { UndoCreate } from "../domain/UndoCreate";
import { UndoDelete } from "../domain/UndoDelete";
import { UndoUpdate } from "../domain/UndoUpdate";
import { UndoState } from "../domain/UndoState";
import { Undo, UndoStates } from "../domain/Undo";

type TaskID = ReturnType<typeof uuidv4>;

export class UndoService {
  constructor(private readonly undoList: Array<Undo> = []) {}

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
