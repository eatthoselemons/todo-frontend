import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
import {
  Add,
  Delete,
  ExpandLess,
  ExpandMore,
  Menu,
  MenuOpen,
  MoreVert,
} from "@mui/icons-material";
import * as React from "react";
import { Task, TaskID } from "../domain/Task";
import {
  createRef,
  MouseEventHandler,
  useContext,
  useEffect,
  useState,
} from "react";
import TaskListWithParent from "./TaskListWithParent";
import { DepthContext, DepthContextProvider } from "../context/DepthContext";
import { CheckboxContext } from "../context/CheckboxContext";
import EventBarrier from "./util/EventBarrier";
import useTaskHooks from "../hooks/useTaskHooks";

interface TaskProps {
  taskID?: TaskID;
}

export const TaskComponent: React.FC<TaskProps> = ({ taskID }) => {
  const [visible, setVisible] = useState<boolean>(false);
  const [showSubTasks, setShowSubTasks] = useState<boolean>(false);
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
              {task?.text} | {task?.id}
            </ListItemText>
          </ListItemButton>

          {/* Context menu */}

          <IconButton
            aria-label={`${task?.id}-sub-task-dropdown`}
            size="large"
            onClick={() => setShowSubTasks(!showSubTasks)}
          >
            {showSubTasks ? (
              <ExpandMore fontSize="inherit" />
            ) : (
              <ExpandLess fontSize="inherit" />
            )}
          </IconButton>
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

        {/* Sub tasks */}

        <Collapse in={showSubTasks} unmountOnExit>
          <ListItem>
            <TaskListWithParent parentId={taskID} />
          </ListItem>
        </Collapse>
      </DepthContextProvider>
    )
  );
};

export default TaskComponent;
