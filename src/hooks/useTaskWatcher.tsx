import { Task, TaskID } from "../domain/Task";
import { useEffect } from "react";
import useTaskHooks from "./useTaskHooks";

export function useTaskWatcher(taskID: TaskID, onChange: (task: Task) => void) {
  const { watchTaskForChanges } = useTaskHooks();

  useEffect(() => {
    const cancel = watchTaskForChanges(taskID, onChange);
    return () => cancel();
  }, [taskID, onChange]);
}
