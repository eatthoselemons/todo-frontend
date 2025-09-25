import * as React from "react";
import { useEffect, useState } from "react";
import { List } from "@mui/material";
import TaskComponent from "./TaskComponent";
import { Task, TaskID } from "../domain/Task";
import useTaskHooks from "../hooks/useTaskHooks";

interface TaskListWithParentProps {
  parentId: TaskID;
}

const TaskListWithParent: React.FC<TaskListWithParentProps> = ({ parentId }) => {
  const [children, setChildren] = useState<Task[]>([]);
  const { getImmediateChildren } = useTaskHooks();

  useEffect(() => {
    (async () => {
      const childTasks = await getImmediateChildren(parentId);
      setChildren(childTasks);
    })();
  }, [parentId, getImmediateChildren]);

  return children.length > 0 ? (
    <List>
      {children.map((child) => (
        <TaskComponent taskID={child.id} key={child.id} />
      ))}
    </List>
  ) : null;
};

export default TaskListWithParent;