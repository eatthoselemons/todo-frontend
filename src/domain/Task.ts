import { v4 as uuidv4 } from "uuid";
import { BorderAll } from "@mui/icons-material";

export type TaskID = ReturnType<typeof uuidv4>;

export enum BaseState {
  CREATED,
  STARTED,
  FINISHED,
}

const BaseStateOrder = [
  BaseState.CREATED,
  BaseState.STARTED,
  BaseState.FINISHED,
];

// const BaseStateOrder = Object.entries(BaseStates).filter(([key, _]) => !/\d+/.test(key)).map(([_, value]) => value)

export interface Transition {
  time: number;
  newState: string;
}

export interface ITask {
  text: string;
  internalState: BaseState;
  id: TaskID;
  path: Array<TaskID>;
  changeLog: Array<Transition>;
}

export class Task implements ITask {
  constructor(
    public text: string,
    public internalState = BaseState.CREATED,
    public readonly id: TaskID = uuidv4(),
    public path: Array<TaskID> = [],
    public changeLog: Array<Transition> = []
  ) {}

  get state(): string {
    return BaseState[this.internalState];
  }

  set state(state: string) {
    // @ts-ignore
    this.internalState = BaseState[state];
  }

  static from(obj: ITask): Task {
    return new Task(obj.text, obj.internalState, obj.id, obj.path || [], obj.changeLog);
  }
}

// enum A {
//   stuff = "stuff",
//   mine = "mine",
// }
//
// const AOrder = [
//     A.stuff,
//     A.mine
// ]
//
// enum B {
//   apple = "apple",
//   orange = "orange",
//   banana = "yellow-banana",
// }
//
// const BOrder = [
//     B.banana,
//     B.apple,
//     B.orange
// ]
//
// interface StateSelector<T> {
//   states: T[],
//   order: T[]
// }
//
// const ASelector: StateSelector<A> = {
//   states: Object.values(A),
//   order: AOrder
// }
//
// const BSelector: StateSelector<B> = {
//   states: Object.values(B),
//   order: BOrder
// }
//
//
// abstract class UseState(stateSelector: StateSelector<T>) {
//   const current = 0
//   function next() {
//     const next = current + 1
//     state = stateSelector.order[next]
//     current = next
//   }
//
// }
