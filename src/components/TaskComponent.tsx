import {
  Box,
  Checkbox,
  Collapse,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Popover,
} from "@mui/material";
import { Add, Delete, MoreVert } from "@mui/icons-material";
import * as React from "react";
import { Task, TaskID } from "../domain/Task";
import {
  createRef,
  MouseEventHandler,
  useContext,
  useEffect,
  useState,
} from "react";
import TaskList from "./TaskList";
import { DepthContext, DepthContextProvider } from "../context/DepthContext";
import { CheckboxContext } from "../context/CheckboxContext";
import EventBarrier from "./util/EventBarrier";
import { TaskContext } from "../context/TaskContext";
import useTaskHooks from "../hooks/useTaskHooks";

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

  const { getTaskById, updateTask } = useTaskHooks();

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

  const handleItemClick: MouseEventHandler = (e) => {
    task.state;
    updateTask(task);
  };

  return (
    visible && (
      <DepthContextProvider>
        <ListItem
          key={taskID}
          secondaryAction={
            // TODO Next state button (quick access)
            <IconButton edge="end" aria-label="actions">
              <MoreVert id={`${taskID}-actions-button`} />
            </IconButton>
          }
        >
          <ListItemButton onClick={handleItemClick}>
            <ListItemIcon>
              <EventBarrier>
                <Checkbox
                  checked={checkedItems[taskID] ?? false}
                  onChange={(e) => {
                    setCheckedItems({
                      ...checkedItems,
                      [taskID]: e.target.checked,
                    });
                  }}
                />
              </EventBarrier>
            </ListItemIcon>
            <ListItemText
              id={`${taskID}-text`}
              // TODO rename (edit mode?)
              // onMouseDown={}
              // onTouchStart={}
            >
              {task?.text}
            </ListItemText>
          </ListItemButton>

          {/* Sub tasks */}

          <Collapse in={subTasksOpen}>
            <TaskList taskIDs={task?.subTaskIds ?? []} />
          </Collapse>

          {/* Context menu */}

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
        </ListItem>
      </DepthContextProvider>
    )
  );
};

export default TaskComponent;
