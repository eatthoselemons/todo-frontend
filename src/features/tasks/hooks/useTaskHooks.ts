import { BaseState, ITask, Task, TaskID, ROOT_ID } from "../domain/Task";
import { useMemo } from "react";
import { useTaskContext } from "../context/TaskContext";

const useTaskHooks = () => {
  const { db } = useTaskContext();

  return useMemo(() => {
    async function ensureRootExists() {
      try {
        await db.get(ROOT_ID);
      } catch (ignore) {
        const rootTask = new Task("root", BaseState.NOT_STARTED, ROOT_ID, [ROOT_ID]);
        await db.put({ _id: ROOT_ID, type: 'task', ...rootTask } as any);
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
        .filter(row => (row.doc as any)?.type === 'task')
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
        .filter(row => (row.doc as any)?.type === 'task')
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
      const children = await getImmediateChildren(ROOT_ID);
      return children.map(child => child.id);
    }

    async function getRootTasks(): Promise<Task[]> {
      await ensureRootExists();
      return getImmediateChildren(ROOT_ID);
    }

    async function getTaskById(id: TaskID): Promise<Task> {
      return Task.from(await db.get(id));
    }

    async function createTask(
      task: Task,
      parentOrId: Task | TaskID = ROOT_ID
    ): Promise<string> {
      await ensureRootExists();

      if (task === null) {
        throw new Error("No task to create");
      }

      // Get parent to build path
      let parent: Task;
      if (typeof parentOrId === 'string') {
        parent = Task.from(await db.get(parentOrId));
      } else {
        parent = parentOrId;
      }

      // Set the path for the new task (parent's path + task's own id)
      task.path = [...parent.path, task.id];

      // Save new task
      const response = await db.put({ _id: task.id, type: 'task', ...task } as any);
      if (response.ok) {
        task._rev = response.rev;
      }

      return task.id;
    }

    async function updateTask(task: Task): Promise<void> {
      try {
        if (task._rev) {
          const response = await db.put({
            _id: task.id,
            type: 'task',
            ...task
          });
          if (response.ok) {
            task._rev = response.rev;
          }
        } else {
          // Fallback if no _rev (fetch first)
          const current = await db.get(task.id);
          const response = await db.put({ ...current, ...task });
          if (response.ok) {
            task._rev = response.rev;
          }
        }
      } catch (err: any) {
        if (err.status === 409) {
          // Conflict: fetch latest and retry
          const current = await db.get(task.id);
          const response = await db.put({
             ...current,
             ...task,
             _id: task.id,
             type: 'task'
          });
          if (response.ok) {
            task._rev = response.rev;
          }
        } else {
          throw err;
        }
      }
    }

    async function deleteTask(id: TaskID) {
      if (id === ROOT_ID) {
        throw new Error("Cannot delete root task");
      }
      await deleteTasks([id]);
    }

    async function moveTask(
      childTask: Task,
      newParentTask: Task
    ): Promise<void> {
      // Get all descendants that need path updates
      const descendants = await getSubtree(childTask.id);
      
      const updates: Task[] = [];

      // Calculate new path for the moved task
      const newPath = [...newParentTask.path, childTask.id];
      const oldPathLength = childTask.path.length;

      // Update the moved task's path
      childTask.path = newPath;
      updates.push(childTask);

      // Update all descendants' paths
      descendants.forEach((descendant) => {
        // Keep the relative path after the moved node
        const relativePath = descendant.path.slice(oldPathLength);
        descendant.path = [...newPath, ...relativePath];
        updates.push(descendant);
      });

      await processBulkChanges(updates, []);
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
      const allTasks = await getAllTasks();
      const toDelete: Task[] = [];
      const idsToDelete = new Set<TaskID>();

      for (const id of taskIds) {
        if (id === ROOT_ID) continue;
        idsToDelete.add(id);
        
        // Find descendants
        const descendants = allTasks.filter(t => t.path.includes(id));
        descendants.forEach(d => idsToDelete.add(d.id));
      }
      
      // Map IDs back to full Task objects (so we have _rev)
      idsToDelete.forEach(id => {
          const task = allTasks.find(t => t.id === id);
          if (task) {
              toDelete.push(task);
          }
      });

      await processBulkChanges([], toDelete);
    }

    async function taskStateChange(id: TaskID, state: BaseState): Promise<void> {
      const task = await getTaskById(id);
      task.internalState = state;
      await updateTask(task);
    }

    async function clearSubTasks(id: TaskID): Promise<void> {
      const children = await getImmediateChildren(id);
      await Promise.all(children.map(child => deleteTask(child.id)));
    }

    async function getAllTasks(): Promise<Task[]> {
      const allDocs = await db.allDocs({ include_docs: true });
      return allDocs.rows
        .filter(row => (row.doc as any)?.type === 'task')
        .map(row => Task.from(row.doc as ITask))
        .filter(task => task.id !== ROOT_ID);
    }

    async function processBulkChanges(
      toSave: Task[],
      toDelete: Task[]
    ): Promise<void> {
      const bulkDocs = [];

      // Process deletes
      for (const task of toDelete) {
        if (task._rev) {
          bulkDocs.push({
            _id: task.id,
            _rev: task._rev,
            _deleted: true
          });
        } else {
           // Fallback if _rev is missing (should generally be avoided)
           // We might need to fetch it, but ideally we passed it in
           console.warn(`Attempting to delete task ${task.id} without _rev`);
           try {
             const doc = await db.get(task.id);
             bulkDocs.push({ ...doc, _deleted: true });
           } catch (e) {
             console.error(`Could not find task ${task.id} to delete`, e);
           }
        }
      }

      // Process saves (updates & creates)
      for (const task of toSave) {
        const newDoc: any = {
          _id: task.id,
          type: 'task',
          ...task
        };
        // Explicitly map _rev if it exists on the object
        if (task._rev) {
          newDoc._rev = task._rev;
        }

        bulkDocs.push(newDoc);
      }

      if (bulkDocs.length > 0) {
        const responses = await db.bulkDocs(bulkDocs);
        
        // Update _revs on the objects in memory so subsequent saves work
        // This is crucial for keeping our local state in sync with DB
        for (let i = 0; i < responses.length; i++) {
          const response = responses[i];
          if ('ok' in response && response.ok) {
             // Find the corresponding task object and update its _rev
             // We need to match based on id since bulkDocs returns in order? 
             // bulkDocs returns order matches input order.
             const isDelete = i < toDelete.length;
             if (!isDelete) {
                const saveIndex = i - toDelete.length;
                const savedTask = toSave[saveIndex];
                if (savedTask && savedTask.id === response.id) {
                   savedTask._rev = response.rev;
                }
             }
          }
        }
      }
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
      clearSubTasks,
      getImmediateChildren,
      getSubtree,
      getParentId,
      getAllTasks,
      processBulkChanges,
    };
  }, [db]);
};

export default useTaskHooks;
