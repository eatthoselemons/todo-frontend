import { BaseState, ITask, Task, TaskID } from "../domain/Task";
import { useMemo } from "react";
import { useTaskContext } from "../context/TaskContext";

const useTaskHooks = () => {
  const { db } = useTaskContext();

  return useMemo(() => {
    async function ensureRootExists() {
      try {
        await db.get("root");
      } catch (ignore) {
        const rootTask = new Task("root", BaseState.NOT_STARTED, "root", ["root"]);
        await db.put({ _id: "root", ...rootTask });
      }
    }

    // Get parent ID from path (second to last element)
    function getParentId(task: Task): TaskID | null {
      if (task.path.length <= 1) return null;
      return task.path[task.path.length - 2];
    }

    // Get all immediate children of a task
    async function getImmediateChildren(taskId: TaskID): Promise<Task[]> {
      const allDocs = await db.allDocs({ include_docs: true });
      return allDocs.rows
        .map(row => Task.from(row.doc as ITask))
        .filter(task => {
          // Task is immediate child if parent (second to last in path) is taskId
          return task.path.length > 1 &&
                 task.path[task.path.length - 2] === taskId;
        });
    }

    // Get entire subtree (all descendants)
    async function getSubtree(taskId: TaskID): Promise<Task[]> {
      const allDocs = await db.allDocs({ include_docs: true });
      return allDocs.rows
        .map(row => Task.from(row.doc as ITask))
        .filter(task => task.path.includes(taskId) && task.id !== taskId);
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
      await ensureRootExists();
      const children = await getImmediateChildren("root");
      return children.map(child => child.id);
    }

    async function getRootTasks(): Promise<Task[]> {
      await ensureRootExists();
      return getImmediateChildren("root");
    }

    async function getTaskById(id: TaskID): Promise<Task> {
      return Task.from(await db.get(id));
    }

    async function createTask(
      task: Task,
      parentId: TaskID = "root"
    ): Promise<string> {
      await ensureRootExists();

      if (task === null) {
        throw new Error("No task to create");
      }

      // Get parent to build path
      const parent = Task.from(await db.get(parentId));

      // Set the path for the new task (parent's path + task's own id)
      task.path = [...parent.path, task.id];

      // Save new task
      await db.put({ _id: task.id, ...task });

      return task.id;
    }

    async function updateTask(task: Task): Promise<void> {
      await db.put({ ...(await db.get(task.id)), ...task });
    }

    async function deleteTask(id: TaskID) {
      if (id === "root") {
        throw new Error("Cannot delete root task");
      }

      try {
        await db.get(id);
      } catch (error) {
        throw new Error(`Task with id ${id} does not exist`);
      }

      // Get all descendants
      const descendants = await getSubtree(id);

      // Delete the task and all descendants
      const toDelete = [id, ...descendants.map(d => d.id)];
      await Promise.all(toDelete.map(async (taskId) => {
        const task = await db.get(taskId);
        await db.remove(task);
      }));
    }

    async function moveTask(
      childTask: Task,
      newParentTask: Task
    ): Promise<void> {
      // Get all descendants that need path updates
      const descendants = await getSubtree(childTask.id);

      // Calculate new path for the moved task
      const newPath = [...newParentTask.path, childTask.id];
      const oldPathLength = childTask.path.length;

      // Update the moved task's path
      childTask.path = newPath;
      await updateTask(childTask);

      // Update all descendants' paths
      await Promise.all(descendants.map(async (descendant) => {
        // Keep the relative path after the moved node
        const relativePath = descendant.path.slice(oldPathLength);
        descendant.path = [...newPath, ...relativePath];
        await updateTask(descendant);
      }));
    }

    async function copyTask(
      childTask: Task,
      newParentTask: Task
    ): Promise<TaskID> {
      // Create new task with same values but new id
      const newTask = new Task(childTask.text, childTask.internalState);

      // Create the task under the new parent
      await createTask(newTask, newParentTask.id);

      // Recursively copy all descendants
      const children = await getImmediateChildren(childTask.id);
      for (const child of children) {
        const copiedChild = await getTaskById(child.id);
        await copyTask(copiedChild, newTask);
      }

      return newTask.id;
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

    async function clearSubTasks(id: TaskID): Promise<void> {
      const children = await getImmediateChildren(id);
      await Promise.all(children.map(child => deleteTask(child.id)));
    }

    // For backward compatibility - returns parent from path
    function getFromChildParentMap(taskId: string): string {
      // This is a temporary compatibility function
      // In the future, we should get the parent directly from the task's path
      throw new Error("getFromChildParentMap is deprecated - use getParentId instead");
    }

    async function getAllTasks(): Promise<Task[]> {
      const allDocs = await db.allDocs({ include_docs: true });
      return allDocs.rows
        .map(row => Task.from(row.doc as ITask))
        .filter(task => task.id !== "root");
    }

    return {
      watchTaskForChanges,
      getRootTaskIds,
      getRootTasks,
      getTaskById,
      createTask,
      copyTask,
      moveTask,
      updateTask,
      deleteTask,
      deleteTasks,
      taskStateChange,
      getFromChildParentMap,
      clearSubTasks,
      getImmediateChildren,
      getSubtree,
      getParentId,
      getAllTasks,
    };
  }, [db]);
};

export default useTaskHooks;