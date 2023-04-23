import {
  Checkbox,
  Collapse,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Popover,
} from "@mui/material";
import { Delete, MoreVert } from "@mui/icons-material";
import * as React from "react";
import { Task, TaskID } from "../domain/Task";
import { createRef, FormEventHandler, useEffect, useState } from "react";
import { createTask, getRootTasks, getTaskById } from "../service/TaskService";

interface TaskProps {
  taskID?: TaskID;
}

export const TaskComponent: React.FC<TaskProps> = ({ taskID }) => {
  const [visible, setVisible] = useState<boolean>(false);
  const [subTasksOpen, setSubTasksOpen] = useState<boolean>(false);
  const [actionsOpen, setActionsOpen] = useState<boolean>(false);

  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<Task | undefined>();

  const newItem = createRef<HTMLInputElement>();

  useEffect(() => {
    if (!loading) {
      return;
    }

    (async () => {
      setTask(await getTaskById(taskID));
      setLoading(false);
    })();
  }, [taskID, loading]);

  // const handleNewItem: FormEventHandler<HTMLFormElement> = (e) => {
  //   e.preventDefault();
  //   if (newItem.current?.value) {
  //     const newTask = new Task(newItem.current.value);
  //     setSubTaskIds([...subTaskIds, newTask.id]);
  //     // TODO Handle async nature with spinner?
  //     // TODO handle adding tasks to non root
  //     createTask(newTask);
  //
  //     newItem.current.value = "";
  //   }
  // };

  return (
    <>
      <ListItem
        key={taskID}
        secondaryAction={
          // TODO Next state button (quick access)
          <IconButton edge="end" aria-label="actions">
            <MoreVert id={`${taskID}-actions-button`} />
          </IconButton>
        }
      >
        <ListItemIcon></ListItemIcon>
        <ListItemText
          id={`${taskID}-text`}
          // TODO rename (edit mode?)
          // onMouseDown={}
          // onTouchStart={}
        >
          {task?.text}
        </ListItemText>
      </ListItem>
      <Collapse in={subTasksOpen}>{/*TODO subtasks*/}</Collapse>
      <Popover
        open={actionsOpen}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        {/*TODO Actions list*/}
        {/*TODO delete*/}
        {/*TODO add*/}
        {/*TODO change state*/}
        {/*TODO rename*/}
      </Popover>
    </>
  );
};

export default TaskComponent;
