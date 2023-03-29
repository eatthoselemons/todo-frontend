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
  afterAll(async () => {
    try {
      await new PouchDB("tasks").destroy();
    } catch (e) {
      console.error(e);
    }
  });

  it("getRootTasks", async () => {
    const task = new Task("getRootTasks");
    await createTask(task);
    expect(await getRootTasks()).toContainEqual(task);
  });

  it("getTaskById", async () => {
    const rootTask = new Task("getTaskById-root");
    await createTask(rootTask);
    expect(await getTaskById(rootTask.id)).toEqual(rootTask);

    const subTask = new Task("getTaskById-child");
    await createTask(subTask, rootTask.id);
    expect(await getTaskById(subTask.id)).toEqual(subTask);
  });

  it("createTask", async () => {
    const rootTask = new Task("createTask-root");
    await createTask(rootTask);

    const subTask = new Task("createTask-child");
    await createTask(subTask, rootTask.id);
    rootTask.subTaskIds.push(subTask.id);
    expect(await getRootTasks()).toContainEqual(rootTask);
    expect(await getTaskById(rootTask.subTaskIds[0])).toEqual(subTask);
    expect(_childParentMap.get(subTask.id)).toBe(rootTask.id);
  });

  it("updateTask", async () => {
    const rootTask = new Task("updateTask-root");
    await createTask(rootTask);

    const subTask = new Task("updateTask-child");
    await createTask(subTask, rootTask);
    rootTask.subTaskIds.push(subTask.id);
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
    await createTask(task);
    expect(getRootTasks()).toBe([new Task("deleteTask")]);
    await deleteTask(task.id);
    expect(getRootTasks()).toBe([]);
  });
});
