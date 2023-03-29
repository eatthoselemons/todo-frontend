import { ITask, Task, TaskID } from "../domain/Task";
import PouchDB from "pouchdb";

const db = new PouchDB<ITask>("tasks");
// Partial visibility based on what task ids are known
const childParentMap = new Map<TaskID, TaskID>();

// Exported for testing but not in production
export const _childParentMap =
  process.env.NODE_ENV === "test" && childParentMap;

async function ensureRoot() {
  try {
    await db.get("root");
  } catch (ignore) {
    await db.put({ _id: "root", ...new Task("root") });
  }
}

function collectChildren(task: Task) {
  task.subTaskIds.forEach((childId) => {
    childParentMap.set(childId, task.id);
  });
}

export async function getRootTasks(): Promise<Task[]> {
  await ensureRoot();

  const current = await db.get("root");

  if (!current) {
    return [];
  }

  collectChildren(current);

  return Promise.all(
    current.subTaskIds.map(async (id: TaskID) => Task.from(await db.get(id)))
  ).then((children: Task[]) => {
    children.forEach((task) => collectChildren(task));
    return children;
  });
}

export async function getTaskById(id: TaskID): Promise<Task> {
  const task = Task.from(await db.get(id));

  collectChildren(task);

  return task;
}

export async function createTask(task: Task, parentId: TaskID): Promise<void>;
export async function createTask(
  task: Task,
  parentTask?: Readonly<Task>
): Promise<void>;
export async function createTask(
  task: Task,
  parentTaskOrId: TaskID | Readonly<Task> = "root"
): Promise<void> {
  await ensureRoot();

  const isObj = typeof parentTaskOrId === "string";

  let parent: Parameters<typeof db.put>[0] = isObj
    ? await db.get(parentTaskOrId)
    : await db.get(parentTaskOrId.id);

  // update parent subtasks
  parent.subTaskIds.push(task.id);
  if (!isObj) {
    parentTaskOrId.subTaskIds.push(task.id);
  }
  await db.put(parent);
  //store ancestry data
  childParentMap.set(task.id, parent.id);

  // save new task
  await db.put({ _id: task.id, ...task });
}

export async function updateTask(task: Task): Promise<void> {
  await db.put({ ...(await db.get(task.id)), ...task });
}

export async function deleteTask(id: TaskID) {
  console.assert(id !== "root");

  const currentTask = await db.get(id);
  const parentTask = await db.get(childParentMap.get(id));
  // delete children before deleting itself
  await Promise.all(currentTask.subTaskIds.map((it) => deleteTask(it)));
  // remove reference to itself after being deleted
  await db.remove(currentTask);

  childParentMap.delete(id);
  parentTask.subTaskIds.splice(parentTask.subTaskIds.indexOf(id), 1);

  await db.put(parentTask);

  // TODO Store task in undo stack, stack is erased on page unload
}
