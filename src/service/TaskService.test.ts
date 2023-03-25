import TaskService from "./TaskService";
import { Task } from "../domain/Task";

describe("TaskService", () => {
  it("getRootTasks", async () => {
    const taskService = new TaskService();
    await taskService.createTask(new Task("getRootTasks"));
    expect(taskService.getRootTasks()).toBe([new Task("getRootTasks")]);
  });

  it("getSubTasks", async () => {
    const taskService = new TaskService();
    await taskService.createTask(new Task("getSubTasks"));
    expect(taskService.getRootTasks()).toBe([new Task("getSubTasks")]);
  });

  it("createTask", async () => {
    const taskService = new TaskService();
    await taskService.createTask(new Task("createTask"));
    expect(taskService.getRootTasks()).toBe([new Task("createTask")]);
  });

  it("updateTask", async () => {
    const taskService = new TaskService();
    const task = new Task("updateTask");
    await taskService.createTask(task);
    expect(taskService.getRootTasks()).toBe([new Task("updateTask")]);
    task.text = "updateTask 2";
    await taskService.updateTask(task);
    expect(taskService.getRootTasks()).toBe([new Task("updateTask 2")]);
  });

  it("deleteTask", async () => {
    const taskService = new TaskService();
    const task = new Task("deleteTask");
    await taskService.createTask(task);
    expect(taskService.getRootTasks()).toBe([new Task("deleteTask")]);
    await taskService.deleteTask(task.id);
    expect(taskService.getRootTasks()).toBe([]);
  });
});
