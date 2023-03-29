import * as React from "react";
import { List } from "@mui/material";
import TaskComponent from "./TaskComponent";
import { Task } from "../domain/Task";

interface TaskListProps {
  tasks: Task[];
}

export const TaskList: React.FC<TaskListProps> = ({ tasks }) => {
  return tasks.length > 0 ? (
    <List>
      {tasks.map((task) => (
        <TaskComponent task={task} key={task.id} />
      ))}
    </List>
  ) : null;
};

export default TaskList;
