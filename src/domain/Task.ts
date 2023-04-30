import { v4 as uuidv4 } from "uuid";

export type TaskID = ReturnType<typeof uuidv4>;

export enum BaseStates {
  CREATED = "CREATED",
  STARTED = "STARTED",
  FINISHED = "FINISHED",
}

export interface Transition {
  time: number;
  newState: string;
}

export interface ITask {
  text: string;
  state: string;
  id: TaskID;
  subTaskIds: Array<TaskID>;
  changeLog: Array<Transition>;
}

export class Task implements ITask {
  constructor(
    public text: string,
    public state: string = BaseStates.CREATED,
    public readonly id: TaskID = uuidv4(),
    public readonly subTaskIds: Array<TaskID> = [],
    public changeLog: Array<Transition> = []
  ) {}

  static from<T extends Task>(obj: T): Task {
    return new Task(obj.text, obj.state, obj.id, obj.subTaskIds);
  }
}
