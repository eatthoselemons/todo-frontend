import {
  Checkbox,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import * as React from "react";
import { Task, TaskID } from "../domain/Task";
import { useState } from "react";

interface TaskProps {
  task: Task;
}

export const TaskComponent: React.FC<TaskProps> = ({ task }) => {
  const [text, setText] = useState<string>(task.text);
  const [state, setState] = useState<string>(task.state);

  return (
    <ListItem
      key={task.id}
      secondaryAction={
        <IconButton edge="end" aria-label="delete">
          <Delete />
        </IconButton>
      }
    >
      <ListItemButton>
        <ListItemText id={`${task.id}-text`}>{text}</ListItemText>
      </ListItemButton>
    </ListItem>
  );
};

export default TaskComponent;
