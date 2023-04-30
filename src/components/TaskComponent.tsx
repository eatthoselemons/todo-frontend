import {
  Box,
  Checkbox,
  Collapse,
  IconButton,
  ListItem,
  ListItemIcon,
  ListItemText,
  Popover,
} from "@mui/material";
import { Add, Delete, MoreVert } from "@mui/icons-material";
import * as React from "react";
import { Task, TaskID } from "../domain/Task";
import { createRef, useContext, useEffect, useState } from "react";
import { getTaskById } from "../service/TaskService";
import TaskList from "./TaskList";
import { DepthContext, DepthContextProvider } from "../context/DepthContext";
import { CheckboxContext } from "../context/CheckboxContext";

interface TaskProps {
  taskID?: TaskID;
}

export const TaskComponent: React.FC<TaskProps> = ({ taskID }) => {
  const [visible, setVisible] = useState<boolean>(false);
  const [subTasksOpen, setSubTasksOpen] = useState<boolean>(false);
  const [actionsOpen, setActionsOpen] = useState<boolean>(false);

  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<Task | undefined>();

  const { checkedItems, setCheckedItems } = useContext(CheckboxContext);
  const { depth } = useContext(DepthContext);

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

  useEffect(() => {
    // TODO get a global depth setting as a filter
    if (depth <= 3) {
      setVisible(true);
    }
  }, [depth, setVisible]);

  return (
    visible && (
      <DepthContextProvider>
        <Checkbox
          checked={checkedItems[taskID] ?? false}
          onChange={(e) => {
            setCheckedItems({ ...checkedItems, [taskID]: e.target.checked });
          }}
        ></Checkbox>
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
        <Collapse in={subTasksOpen}>
          <TaskList taskIDs={task?.subTaskIds ?? []} />
        </Collapse>
        {/*{<Box sx={{ visible: isEditMode(interfaceMode) }}>*/}

        {/*{isEditMode(interfaceMode) && (*/}
        {/*  <Box>*/}
        {/*    <IconButton aria-label="delete" size="large">*/}
        {/*      <Delete fontSize="inherit" color="error" />*/}
        {/*    </IconButton>*/}
        {/*    <IconButton*/}
        {/*      aria-label="add"*/}
        {/*      size="large"*/}
        {/*      onClick={() => setShowAddModal(true)}*/}
        {/*    >*/}
        {/*      <Add fontSize="inherit" />*/}
        {/*    </IconButton>*/}
        {/*  </Box>*/}
        {/*)}*/}
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
      </DepthContextProvider>
    )
  );
};

export default TaskComponent;
