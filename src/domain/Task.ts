import { v4 as uuidv4 } from "uuid";

export type TaskID = ReturnType<typeof uuidv4>;

export enum BaseStates {
  UNSTARTED = "UNSTARTED",
  STARTED = "STARTED",
  FINISHED = "FINISHED",
}

export class Task {
  public id: TaskID = uuidv4();
  public subItems: Array<TaskID> = [];

  constructor(
    public text: string,
    public state: string = BaseStates.UNSTARTED
  ) {}
}
