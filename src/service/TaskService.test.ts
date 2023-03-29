import { Task } from "../domain/Task";
import {
  _childParentMap,
  createTask,
  deleteTask,
  getRootTasks,
  getTaskById,
  updateTask,
} from "./TaskService";
import PouchDB from "pouchdb";

describe("TaskService", () => {
  beforeAll(async () => {
    try {
      await new PouchDB("tasks").destroy();
    } catch (e) {
      console.error(e);
    }
  });
  afterAll(async () => {
    try {
      await new PouchDB("tasks").destroy();
    } catch (e) {
      console.error(e);
    }
  });

  it("getRootTasks", async () => {
    const task = new Task("getRootTasks");
    await createTestTask(task);
    expect(await getRootTasks()).toContainEqual(task);
  });

  it("getTaskById", async () => {
    const rootTask = new Task("getTaskById-root");
    await createTestTask(rootTask);
    expect(await getTaskById(rootTask.id)).toEqual(rootTask);

    const subTask = new Task("getTaskById-child");
    await createTestTask(subTask, rootTask);
    expect(await getTaskById(subTask.id)).toEqual(subTask);
  });

  it("createTask", async () => {
    const rootTask = new Task("createTask-root");
    await createTestTask(rootTask);

    const subTask = new Task("createTask-child");
    await createTestTask(subTask, rootTask);
    expect(await getRootTasks()).toContainEqual(rootTask);
    expect(await getTaskById(rootTask.subTaskIds[0])).toEqual(subTask);
    expect(_childParentMap.get(subTask.id)).toBe(rootTask.id);
  });

  it("createEmptyTask", async () => {
    expect(() => {
      createTask(null);
    }).toThrow();
  });

  it("twoParentTasks", async () => {
    // TODO can assign a task to two parent tasks
    expect("true").toBe("true");
  });

  it("updateTask", async () => {
    const rootTask = new Task("updateTask-root");
    await createTask(rootTask);

    const subTask = new Task("updateTask-child");
    await createTestTask(subTask, rootTask);
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
    await createTestTask(task);
    expect(await getTaskById(task.id)).toEqual(task);
    await deleteTask(task.id);
    expect(await getRootTasks()).not.toContainEqual(task);
    expect(() => getTaskById(task.id)).toThrow();
  });

  it("delete missing task", async () => {
    expect(() => deleteTask("missing")).toThrow();
  });
});

async function createTestTask(task: Task, parent?: Task) {
  await createTask(task, parent?.id);
  // Update the parent to contain the new id (its already that way in the db, but we don't wanna bother doing another get)
  parent?.subTaskIds.push(task.id);
}
