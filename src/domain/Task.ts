import { v4 as uuidv4 } from "uuid";

export type TaskID = ReturnType<typeof uuidv4>;

export enum BaseState {
  NOT_STARTED = "not_started",
  IN_PROGRESS = "in_progress",
  BLOCKED = "blocked",
  DONE = "done",
}

const BaseStateOrder = [
  BaseState.NOT_STARTED,
  BaseState.IN_PROGRESS,
  BaseState.BLOCKED,
  BaseState.DONE,
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
  dueDate?: string;
}

export class Task implements ITask {
  constructor(
    public text: string,
    public internalState = BaseState.NOT_STARTED,
    public readonly id: TaskID = uuidv4(),
    public path: Array<TaskID> = [],
    public changeLog: Array<Transition> = [],
    public dueDate?: string
  ) {}

  get state(): string {
    return this.internalState;
  }

  set state(state: string) {
    const upperState = state.toUpperCase() as keyof typeof BaseState;
    if (upperState in BaseState) {
      this.internalState = BaseState[upperState];
    }
  }

  static from(obj: ITask): Task {
    return new Task(obj.text, obj.internalState, obj.id, obj.path || [], obj.changeLog, obj.dueDate);
  }

  nextState(): void {
    const currentIndex = BaseStateOrder.indexOf(this.internalState);
    const nextIndex = (currentIndex + 1) % BaseStateOrder.length;
    this.internalState = BaseStateOrder[nextIndex];
    this.changeLog.push({
      time: Date.now(),
      newState: this.internalState,
    });
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
