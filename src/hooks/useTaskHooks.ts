import { BaseState, ITask, Task, TaskID } from "../domain/Task";
import { useContext, useMemo } from "react";
import { TaskContext } from "../context/TaskContext";

const useTaskHooks = () => {
  const { childParentMap, db } = useContext(TaskContext);

  return useMemo(() => {
    async function ensureRoot() {
      try {
        await db.get("root");
      } catch (ignore) {
        await db.put({ _id: "root", ...new Task("root"), id: "root" });
      }
    }

    function collectChildren(task: Task) {
      task.subTaskIds.forEach((childId) => {
        childParentMap.set(childId, task.id);
      });
    }

    function watchTaskForChanges(
      taskId: TaskID,
      onChange: (task: Task) => void
    ): () => void {
      const changes = db
        .changes({
          since: "now",
          live: true,
          filter: (doc) => doc._id === taskId,
        })
        .on("change", (_) => {
          db.get(taskId).then((task) => {
            onChange(Task.from(task));
          });
        });

      return () => {
        changes.cancel();
      };
    }

    async function getRootTaskIds(): Promise<TaskID[]> {
      await ensureRoot();

      const current = await db.get("root");

      if (!current) {
        return [];
      }

      collectChildren(Task.from(current));

      return current.subTaskIds;
    }

    async function getRootTasks(): Promise<Task[]> {
      await ensureRoot();

      const current = await db.get("root");

      if (!current) {
        return [];
      }

      collectChildren(Task.from(current));

      return Promise.all(
        current.subTaskIds.map(async (id: TaskID) =>
          Task.from(await db.get(id))
        )
      ).then((children: Task[]) => {
        children.forEach((task) => collectChildren(task));
        return children;
      });
    }

    async function getTaskById(id: TaskID): Promise<Task> {
      const task = Task.from(await db.get(id));

      collectChildren(task);

      return task;
    }

    async function createTask(
      task: Task,
      parentId: TaskID = "root"
    ): Promise<void> {
      await ensureRoot();

      if (task === null) {
        throw new Error("No task to create");
      }
      if (childParentMap.get(task.id) === parentId) {
        throw new Error("Task is already the child of another task");
      }

      const parent = await db.get(parentId);

      // update parent subtasks
      parent.subTaskIds.push(task.id);
      await db.put({ _id: parentId, ...parent });
      //store ancestry data
      childParentMap.set(task.id, parent.id);

      // save new task
      await db.put({ _id: task.id, ...task });
    }

    async function moveTask(childTask: Task, parentTask: Task): Promise<void> {
      parentTask.subTaskIds.push(childTask.id);
      childParentMap.set(childTask.id, parentTask.id);
      await updateTask(parentTask);
    }

    async function updateTask(task: Task): Promise<void> {
      // TODO handle "rebase" where a child is moved to a different parent
      // why not use getbyId here?
      await db.put({ ...(await db.get(task.id)), ...task });
    }

    async function deleteTask(id: TaskID) {
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

    async function deleteTasks(taskIds: Array<TaskID>) {
      await Promise.all(taskIds.map((key) => deleteTask(key)));
    }

    async function taskStateChange(id: TaskID, state: string): Promise<void> {
      const tempTask: ITask = await db.get(id);
      // @ts-ignore
      tempTask.internalState = BaseState[state];
      db.put(tempTask);
    }

    return {
      watchTaskForChanges,
      getRootTaskIds,
      getRootTasks,
      getTaskById,
      createTask,
      moveTask,
      updateTask,
      deleteTask,
      deleteTasks,
      taskStateChange,
    };
  }, [db, childParentMap]);
};

export default useTaskHooks;
