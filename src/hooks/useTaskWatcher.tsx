import { Task, TaskID } from "../domain/Task";
import { useEffect } from "react";
import { watchTaskForChanges } from "../service/TaskService";

export function useTaskWatcher(taskID: TaskID, onChange: (task: Task) => void) {
  useEffect(() => {
    const cancel = watchTaskForChanges(taskID, onChange);
    return () => cancel();
  }, [taskID, onChange]);
}
