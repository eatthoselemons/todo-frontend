import PouchDB from "pouchdb";
import React, { PropsWithChildren } from "react";
import useTaskHooks from "./useTaskHooks";
import { BaseState, ITask, Task, TaskID } from "../domain/Task";
import {
  TaskContextProvider,
  TaskContextProviderProps,
} from "../context/TaskContext";
import { renderHook } from "@testing-library/react";
import { Simulate } from "react-dom/test-utils";
import error = Simulate.error;

const createWrapper = ({
  db = new PouchDB<ITask>("testTasks", { adapter: "memory" }),
}: TaskContextProviderProps = {}): React.FC<PropsWithChildren> => {
  return ({ children }) => {
    return (
      <TaskContextProvider db={db}>
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

  it("createTask", async () => {
    const {
      result: {
        current: hooks,
        current: { getRootTasks, getTaskById, getImmediateChildren },
      },
    } = renderHook(useTaskHooks, {
      wrapper: createWrapper(),
    });
    const rootTask = new Task("createTask-root");
    await createTestTask(hooks, rootTask);

    const subTask = new Task("createTask-child");
    await createTestTask(hooks, subTask, rootTask);
    expect(await getRootTasks()).toContainEqual(rootTask);

    // Check that subTask is a child of rootTask using path-based query
    const children = await getImmediateChildren(rootTask.id);
    expect(children).toContainEqual(subTask);

    // Check that subTask has correct path
    const fetchedSubTask = await getTaskById(subTask.id);
    expect(fetchedSubTask.path).toEqual(["root", rootTask.id, subTask.id]);

    // @formatter:off
    const uuidRegex = new RegExp("^\\w{8}-\\w{4}-\\w{4}-\\w{4}-\\w{12}$");
    // @formatter:on
    expect(uuidRegex.test(rootTask.id)).toEqual(true);
    expect(uuidRegex.test(subTask.id)).toEqual(true);
  });

  it("createEmptyTask", async () => {
    const {
      result: {
        current: { createTask },
      },
    } = renderHook(useTaskHooks, {
      wrapper: createWrapper(),
    });
    await expect(async () => {
      await createTask(null);
    }).rejects;
  });

  it("twoParentTasks", async () => {
    // TODO can assign a task to two parent tasks
    expect("true").toBe("true");
  });

  it("updateTask", async () => {
    const rootTask = new Task("updateTask-root");
    const {
      result: {
        current: hooks,
        current: { updateTask, getTaskById, getImmediateChildren },
      },
    } = renderHook(useTaskHooks, {
      wrapper: createWrapper(),
    });
    await createTestTask(hooks, rootTask);

    const subTask = new Task("updateTask-child");
    await createTestTask(hooks, subTask, rootTask);

    const children = await getImmediateChildren(rootTask.id);
    expect(children[0]).toEqual(subTask);

    const dbSubTask = await getTaskById(subTask.id);
    expect(dbSubTask).not.toBe(subTask); // Should not be the same object
    expect(dbSubTask).toEqual(subTask); // But should be equal
    subTask.text = "updateTask-updated";
    await updateTask(subTask);
    expect((await getTaskById(subTask.id)).text).toEqual("updateTask-updated");
  });

  it("deleteTask", async () => {
    const task = new Task("deleteTask");
    const {
      result: {
        current: hooks,
        current: { deleteTask, getTaskById, getRootTasks },
      },
    } = renderHook(useTaskHooks, {
      wrapper: createWrapper(),
    });
    await createTestTask(hooks, task);
    expect(await getTaskById(task.id)).toEqual(task);
    await deleteTask(task.id);
    expect(await getRootTasks()).not.toContainEqual(task);
    expect(async () => await getTaskById(task.id)).rejects.toThrow();
  });

  it("delete missing task", async () => {
    const {
      result: {
        current: { deleteTask },
      },
    } = renderHook(useTaskHooks, {
      wrapper: createWrapper(),
    });
    expect(async () => await deleteTask("missing")).rejects.toThrow();
  });

  it("move task", async () => {
    const {
      result: {
        current: hooks,
        current: { createTask, getTaskById, moveTask, getImmediateChildren },
      },
    } = renderHook(useTaskHooks, {
      wrapper: createWrapper(),
    });
    const rootTask = new Task("moveTask-root");
    await createTask(rootTask);

    const subTask1 = new Task("moveTask-child1");
    await createTestTask(hooks, subTask1, rootTask);

    const subTask2 = new Task("moveTask-child2");
    await createTestTask(hooks, subTask2, rootTask);

    const moveTestTask = new Task("moveTask-moving");
    await createTestTask(hooks, moveTestTask, subTask1);

    // Check task is under subTask1
    let children1 = await getImmediateChildren(subTask1.id);
    expect(children1.map(c => c.id)).toContain(moveTestTask.id);

    // Check path is correct
    let movedTask = await getTaskById(moveTestTask.id);
    expect(movedTask.path).toEqual(["root", rootTask.id, subTask1.id, moveTestTask.id]);

    await moveTask(moveTestTask, subTask2);

    // task under subtask2
    let children2 = await getImmediateChildren(subTask2.id);
    expect(children2.map(c => c.id)).toContain(moveTestTask.id);

    // Check new path is correct
    movedTask = await getTaskById(moveTestTask.id);
    expect(movedTask.path).toEqual(["root", rootTask.id, subTask2.id, moveTestTask.id]);

    // task no longer under subtask1
    children1 = await getImmediateChildren(subTask1.id);
    expect(children1.map(c => c.id)).not.toContain(
      moveTestTask.id
    );
  });

  it("copyTask", async () => {
    const {
      result: {
        current: hooks,
        current: { createTask, copyTask, getTaskById, getImmediateChildren },
      },
    } = renderHook(useTaskHooks, {
      wrapper: createWrapper(),
    });

    const rootTask = new Task("copyTask-root");
    await createTask(rootTask);

    const subTask1 = new Task("copyTask-child1");
    await createTestTask(hooks, subTask1, rootTask);

    const subTask2 = new Task("copyTask-child2");
    await createTestTask(hooks, subTask2, rootTask);

    const copyTestTask = new Task("task-to-copy");
    await createTestTask(hooks, copyTestTask, subTask1);

    // check that task exists under subtask1
    let children1 = await getImmediateChildren(subTask1.id);
    expect(children1.map(c => c.id)).toContain(copyTestTask.id);

    // check that task isn't under subtask2
    let children2 = await getImmediateChildren(subTask2.id);
    expect(children2.map(c => c.id)).not.toContain(copyTestTask.id);

    //copy task
    let newTaskId = await copyTask(copyTestTask, subTask2);

    // new task under subtask2
    children2 = await getImmediateChildren(subTask2.id);
    expect(children2.map(c => c.id)).toContain(newTaskId);

    // Check new task has correct path
    const newTask = await getTaskById(newTaskId);
    expect(newTask.path).toEqual(["root", rootTask.id, subTask2.id, newTaskId]);

    //old task still under subtask1
    children1 = await getImmediateChildren(subTask1.id);
    expect(children1.map(c => c.id)).toContain(copyTestTask.id);
  });

  it("updateState", async () => {
    const {
      result: {
        current: hooks,
        current: { createTask, getTaskById, taskStateChange },
      },
    } = renderHook(useTaskHooks, {
      wrapper: createWrapper(),
    });
    const rootTask = new Task("updateState-root");
    await createTask(rootTask);

    const subTask1 = new Task("updateState-child1");
    await createTestTask(hooks, subTask1, rootTask);

    expect((await getTaskById(subTask1.id)).internalState).toBe(
      BaseState.NOT_STARTED
    );
    await taskStateChange(subTask1.id, "IN_PROGRESS");
    expect((await getTaskById(subTask1.id)).state).toBe(
      BaseState.IN_PROGRESS
    );
  });
});

// Creates a task under a parent if specified
async function createTestTask(
  { createTask }: ReturnType<typeof useTaskHooks>,
  task: Task,
  parent?: Task
) {
  await createTask(task, parent?.id);
}
