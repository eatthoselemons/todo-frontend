import PouchDB from "pouchdb";
import React, { PropsWithChildren } from "react";
import useTaskHooks from "./useTaskHooks";
import { ITask, Task, TaskID } from "../domain/Task";
import {
  TaskContextProvider,
  TaskContextProviderProps,
} from "../context/TaskContext";
import { renderHook } from "@testing-library/react";

const createWrapper = ({
  db = new PouchDB<ITask>("testTasks", { adapter: "memory" }),
  childParentMap,
}: TaskContextProviderProps = {}): React.FC<PropsWithChildren> => {
  return ({ children }) => {
    return (
      <TaskContextProvider db={db} childParentMap={childParentMap}>
        {children}
      </TaskContextProvider>
    );
  };
};

describe("TaskService", () => {
  it("getRootTasks", async () => {
    const task = new Task("getRootTasks");

    const {
      result: {
        current: hooks,
        current: { getRootTasks },
      },
    } = renderHook(useTaskHooks, {
      wrapper: createWrapper(),
    });

    await createTestTask(hooks, task);

    expect(await getRootTasks()).toContainEqual(task);
  });

  it("getTaskById", async () => {
    const rootTask = new Task("getTaskById-root");

    const {
      result: {
        current: hooks,
        current: { getTaskById },
      },
    } = renderHook(useTaskHooks, {
      wrapper: createWrapper(),
    });

    await createTestTask(hooks, rootTask);
    expect(await getTaskById(rootTask.id)).toEqual(rootTask);

    const subTask = new Task("getTaskById-child");
    await createTestTask(hooks, subTask, rootTask);
    expect(await getTaskById(subTask.id)).toEqual(subTask);
  });

  // it("createTask", async () => {
  //   const rootTask = new Task("createTask-root");
  //   await createTestTask(rootTask);
  //
  //   const subTask = new Task("createTask-child");
  //   await createTestTask(subTask, rootTask);
  //   expect(await getRootTasks()).toContainEqual(rootTask);
  //   expect(await getTaskById(rootTask.subTaskIds[0])).toEqual(subTask);
  //   expect(_childParentMap.get(subTask.id)).toBe(rootTask.id);
  // });
  //
  // it("createEmptyTask", async () => {
  //   expect(() => {
  //     createTask(null);
  //   }).toThrow();
  // });
  //
  // it("twoParentTasks", async () => {
  //   // TODO can assign a task to two parent tasks
  //   expect("true").toBe("true");
  // });
  //
  // it("updateTask", async () => {
  //   const rootTask = new Task("updateTask-root");
  //   await createTask(rootTask);
  //
  //   const subTask = new Task("updateTask-child");
  //   await createTestTask(subTask, rootTask);
  //   expect(await getTaskById(rootTask.subTaskIds[0])).toEqual(subTask);
  //   const dbSubTask = await getTaskById(subTask.id);
  //   expect(dbSubTask).not.toBe(subTask); // Should not be the same object
  //   expect(dbSubTask).toEqual(subTask); // But should be equal
  //   subTask.text = "updateTask-updated";
  //   await updateTask(subTask);
  //   expect((await getTaskById(subTask.id)).text).toEqual("updateTask-updated");
  // });
  //
  // it("deleteTask", async () => {
  //   const task = new Task("deleteTask");
  //   await createTestTask(task);
  //   expect(await getTaskById(task.id)).toEqual(task);
  //   await deleteTask(task.id);
  //   expect(await getRootTasks()).not.toContainEqual(task);
  //   expect(() => getTaskById(task.id)).toThrow();
  // });
  //
  // it("delete missing task", async () => {
  //   expect(() => deleteTask("missing")).toThrow();
  // });
  //
  // it("move task", async () => {
  //   const rootTask = new Task("moveTask-root");
  //   await createTask(rootTask);
  //
  //   const subTask1 = new Task("moveTask-child1");
  //   await createTestTask(subTask1, rootTask);
  //
  //   const subTask2 = new Task("moveTask-child1");
  //   await createTestTask(subTask2, rootTask);
  //
  //   const moveTestTask = new Task("moveTask-moving");
  //   await createTestTask(moveTestTask, subTask1);
  //
  //   expect((await getTaskById(subTask1.id)).subTaskIds).toContainEqual(
  //     moveTestTask.id
  //   );
  //   expect(_childParentMap.get(moveTestTask.id)).toContainEqual(subTask1.id);
  //
  //   await moveTask(moveTestTask, subTask2);
  //   // need to add not contain
  //   expect((await getTaskById(subTask2.id)).subTaskIds).toContainEqual(
  //     moveTestTask.id
  //   );
  //   expect(_childParentMap.get(moveTestTask.id)).toContainEqual(subTask2.id);
  // });
  //
  // it("updateState", async () => {
  //   const rootTask = new Task("updateState-root");
  //   await createTask(rootTask);
  //
  //   const subTask1 = new Task("updateState-child1");
  //   await createTestTask(subTask1, rootTask);
  //
  //   expect((await getTaskById(subTask1.id)).state).toBe(BaseStates.CREATED);
  //   await taskStateChange(subTask1.id, BaseStates.STARTED);
  //   expect((await getTaskById(subTask1.id)).state).toBe(BaseStates.STARTED);
  // });
});

async function createTestTask(
  { createTask }: ReturnType<typeof useTaskHooks>,
  task: Task,
  parent?: Task
) {
  await createTask(task, parent?.id);
  // Update the parent to contain the new id (its already that way in the db, but we don't wanna bother doing another get)
  parent?.subTaskIds.push(task.id);
}
