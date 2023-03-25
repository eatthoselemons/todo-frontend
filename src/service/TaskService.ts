import { Task, TaskID } from "../domain/Task";
import PouchDB from "pouchdb";

export default class TaskService {
  private db = new PouchDB<Task>("tasks");
  // Partial visibility based on what has been retrieved
  private childParentMap = new Map<TaskID, TaskID>();

  public static INSTANCE = new TaskService();

  async ensureRoot() {
    if ((await this.db.get("root")) === undefined) {
      await this.db.put({ _id: "root", ...new Task("root") });
    }
  }

  async getRootTasks(): Promise<Task[]> {
    await this.ensureRoot();
    return this.getSubTasks("root");
  }

  async getSubTasks(id: TaskID = "root"): Promise<Task[]> {
    await this.ensureRoot();

    const current = await this.db.get(id);

    if (!current) {
      return [];
    }

    return Promise.all(
      current.subTasks.map((id: TaskID) => this.db.get(id))
    ).then((children: Task[]) => {
      children.forEach((it: Task) => this.childParentMap.set(it.id, id));
      return children;
    });
  }

  async createTask(task: Task, parentID: TaskID = "root"): Promise<void> {
    await this.ensureRoot();

    // update parent subtasks
    const parent = await this.db.get(parentID);
    parent.subTasks.push(task.id);
    await this.db.put(parent);
    //store ancestry data
    this.childParentMap.set(task.id, parent.id);

    // save new task
    await this.db.put({ _id: task.id, ...task });
  }

  async updateTask(task: Task): Promise<void> {
    await this.db.put({ _id: task.id, ...task });
  }

  async deleteTask(id: TaskID) {
    console.assert(id !== "root");

    const currentTask = await this.db.get(id);
    const parentTask = await this.db.get(this.childParentMap.get(id));
    // delete children before deleting itself
    await Promise.all(currentTask.subTasks.map((it) => this.deleteTask(it)));
    // remove reference to itself after being deleted
    await this.db.remove(currentTask);

    this.childParentMap.delete(id);
    parentTask.subTasks.splice(parentTask.subTasks.indexOf(id), 1);

    await this.db.put(parentTask);

    // TODO Store task in undo stack, stack is erased on page unload
  }
}
