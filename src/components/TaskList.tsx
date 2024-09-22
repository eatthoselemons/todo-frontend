import * as React from "react";
import { Accordion, Box, List } from "@mui/material";
import TaskComponent from "./TaskComponent";
import { TaskID } from "../domain/Task";

interface TaskListProps {
  taskIDs: TaskID[];
}

const TaskList: React.FC<TaskListProps> = ({ taskIDs }) => {
  return taskIDs.length > 0 ? (
    <List>
      {taskIDs.map((taskID) => (
        <Box sx={{ flexDirection: "column" }}>
          <TaskComponent taskID={taskID} key={taskID} />
        </Box>
      ))}
    </List>
  ) : null;
};

export default TaskList;
