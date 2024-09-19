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

  it("createTask", async () => {
    const childParentMap = new Map<TaskID, TaskID>();
    const {
      result: {
        current: hooks,
        current: { getRootTasks, getTaskById },
      },
    } = renderHook(useTaskHooks, {
      wrapper: createWrapper({ childParentMap }),
    });
    const rootTask = new Task("createTask-root");
    await createTestTask(hooks, rootTask);

    const subTask = new Task("createTask-child");
    await createTestTask(hooks, subTask, rootTask);
    expect(await getRootTasks()).toContainEqual(rootTask);
    expect(await getTaskById(rootTask.subTaskIds[0])).toEqual(subTask);
    expect(childParentMap.get(subTask.id)).toBe(rootTask.id);
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
    const childParentMap = new Map<TaskID, TaskID>();
    const {
      result: {
        current: hooks,
        current: { updateTask, getTaskById },
      },
    } = renderHook(useTaskHooks, {
      wrapper: createWrapper({ childParentMap }),
    });
    await createTestTask(hooks, rootTask);

    const subTask = new Task("updateTask-child");
    await createTestTask(hooks, subTask, rootTask);
    expect(await getTaskById(rootTask.subTaskIds[0])).toEqual(subTask);
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
    const childParentMap = new Map<TaskID, TaskID>();
    const {
      result: {
        current: hooks,
        current: { createTask, getTaskById, moveTask },
      },
    } = renderHook(useTaskHooks, {
      wrapper: createWrapper({ childParentMap }),
    });
    const rootTask = new Task("moveTask-root");
    await createTask(rootTask);

    const subTask1 = new Task("moveTask-child1");
    await createTestTask(hooks, subTask1, rootTask);

    const subTask2 = new Task("moveTask-child1");
    await createTestTask(hooks, subTask2, rootTask);

    const moveTestTask = new Task("moveTask-moving");
    await createTestTask(hooks, moveTestTask, subTask1);

    expect((await getTaskById(subTask1.id)).subTaskIds).toContain(
      moveTestTask.id
    );
    expect(childParentMap.get(moveTestTask.id)).toContain(subTask1.id);

    await moveTask(moveTestTask, subTask2);
    // task under subtask2
    expect((await getTaskById(subTask2.id)).subTaskIds).toContain(
      moveTestTask.id
    );
    expect(childParentMap.get(moveTestTask.id)).toContain(subTask2.id);

    // task no longer under subtask1
    expect((await getTaskById(subTask1.id)).subTaskIds).not.toContain(
      moveTestTask.id
    );
    expect(childParentMap.get(moveTestTask.id)).not.toContain(subTask1.id);
  });

  it("copyTask", async () => {
    const childParentMap = new Map<TaskID, TaskID>();
    const {
      result: {
        current: hooks,
        current: { createTask, copyTask, getTaskById },
      },
    } = renderHook(useTaskHooks, {
      wrapper: createWrapper({ childParentMap }),
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
    expect((await getTaskById(subTask1.id)).subTaskIds).toContain(
      copyTestTask.id
    );
    expect(childParentMap.get(copyTestTask.id)).toContain(subTask1.id);

    // check that task isn't under subtask2
    expect((await getTaskById(subTask2.id)).subTaskIds).not.toContain(
      copyTestTask.id
    );
    expect(childParentMap.get(copyTestTask.id)).not.toContain(subTask2.id);

    //copy task
    let newTaskId = await copyTask(copyTestTask, subTask2);

    // task under subtask2
    expect((await getTaskById(subTask2.id)).subTaskIds).toContain(newTaskId);
    expect(childParentMap.get(newTaskId)).toContain(subTask2.id);

    //old task still under subtask1
    expect((await getTaskById(subTask1.id)).subTaskIds).toContain(
      copyTestTask.id
    );
    expect(childParentMap.get(copyTestTask.id)).toContain(subTask1.id);
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
      BaseState.CREATED
    );
    await taskStateChange(subTask1.id, BaseState[BaseState.STARTED]);
    expect((await getTaskById(subTask1.id)).state).toBe(
      BaseState[BaseState.STARTED]
    );
  });
});

// Creates a task and pushes to the parent subtasks if the parent exists
async function createTestTask(
  { createTask }: ReturnType<typeof useTaskHooks>,
  task: Task,
  parent?: Task
) {
  await createTask(task, parent?.id);
  // Update the parent to contain the new id (its already that way in the db, but we don't wanna bother doing another get)
  parent?.subTaskIds.push(task.id);
}
