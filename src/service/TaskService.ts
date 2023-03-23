import { Task, TaskID } from "../domain/Task";
import PouchDB from "pouchdb";

const db = new PouchDB<Task>("tasks");
// Partial visibility based on what has been retrieved
const childParentMap = new Map<TaskID, TaskID>();

export async function getRootTasks(): Promise<Task[]> {
  return getSubTasks("root");
}

export async function getSubTasks(id: TaskID): Promise<Task[]> {
  const current = await db.get(id);

  if (!current) {
    return [];
  }

  return Promise.all(current.subItems.map((id: TaskID) => db.get(id))).then(
    (children: Task[]) => {
      children.forEach((it: Task) => childParentMap.set(it.id, id));
      return children;
    }
  );
}

export async function createTask(
  parentID: TaskID = "root",
  task: Task
): Promise<void> {
  if ((await db.get("root")) === undefined) {
    await db.put({ _id: "root", ...new Task("root") });
  }

  const parent = await db.get(parentID);
  parent.subItems.push(task.id);
  await db.put(parent);

  await db.put({ _id: task.id, ...task });
}

export async function updateTask(task: Task): Promise<void> {
  await db.put({ _id: task.id, ...task });
}

export function deleteTask(id: TaskID) {
  console.assert(id !== "root");

  // TODO delete from parents subTasks list
  // TODO recursively delete all children?
  // TODO Store task in undo stack, stack is erased on page unload

  // db.remove(id);
}
