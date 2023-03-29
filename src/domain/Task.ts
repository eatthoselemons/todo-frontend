import { v4 as uuidv4 } from "uuid";

export type TaskID = ReturnType<typeof uuidv4>;

export enum BaseStates {
  UNSTARTED = "UNSTARTED",
  STARTED = "STARTED",
  FINISHED = "FINISHED",
}

export interface ITask {
  text: string;
  state: string;
  id: TaskID;
  subTaskIds: Array<TaskID>;
}

export class Task {
  constructor(
    public text: string,
    public state: string = BaseStates.UNSTARTED,
    public readonly id: TaskID = uuidv4(),
    public readonly subTaskIds: Array<TaskID> = []
  ) {}

  static from<T extends Task>(obj: T): Task {
    return new Task(obj.text, obj.state, obj.id, obj.subTaskIds);
  }
}
