import { Task, TaskID } from "../domain/Task";
import { useEffect, useCallback, useRef } from "react";
import useTaskHooks from "./useTaskHooks";

export function useTaskWatcher(taskID: TaskID, onChange: (task: Task) => void) {
  const { watchTaskForChanges } = useTaskHooks();

  // Stabilize onChange callback to prevent unnecessary re-subscriptions
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const stableOnChange = useCallback((task: Task) => {
    onChangeRef.current(task);
  }, []);

  useEffect(() => {
    const cancel = watchTaskForChanges(taskID, stableOnChange);
    return () => cancel();
  }, [taskID, watchTaskForChanges, stableOnChange]);
}
