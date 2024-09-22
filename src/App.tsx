import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  Box,
  Button,
  Container,
  IconButton,
  List,
  ListItem,
  Stack,
  Typography,
} from "@mui/material";
import { Add, Delete, Menu, MenuOpen } from "@mui/icons-material";
import TaskList from "./components/TaskList";
import { AddTaskModal } from "./components/AddTaskModal";
import { Task, TaskID } from "./domain/Task";
import { useTaskWatcher } from "./hooks/useTaskWatcher";
import {
  CheckboxContext,
  CheckboxContextProvider,
} from "./context/CheckboxContext";
import useTaskHooks from "./hooks/useTaskHooks";
import { MenuModal } from "./components/MenuModal";

const App: React.FC = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [taskIds, setTaskIds] = useState<TaskID[]>([]);
  const { checkedItems } = useContext(CheckboxContext);

  const { getTaskById, getRootTaskIds, deleteTasks } = useTaskHooks();

  useEffect(() => {
    getRootTaskIds().then(setTaskIds);
  }, []);

  const getFirstCheckedId = () => {
    return Object.keys(checkedItems).filter((key) => checkedItems[key])[0];
  };

  const onRootTaskChange = useCallback((task: Task) => {
    setTaskIds(task.subTaskIds);
  }, []);

  const deleteSelectedTasks = useCallback(() => {
    Promise.resolve(
      Object.keys(checkedItems).filter((id) => checkedItems[id])
    ).then(deleteTasks);
  }, [checkedItems]);

  const [checkedSubtasks, setCheckedSubtasks] = useState<String[]>([]);
  const currentSubTaskIds = () => {
    Promise.resolve(getTaskById(getFirstCheckedId()))
      .then((task) => task.subTaskIds)
      .then((ids) => {
        setCheckedSubtasks(ids);
      });
  };

  useTaskWatcher("root", onRootTaskChange);

  return (
    <Container>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          width: "100%",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h3">Liz'z Lemons</Typography>
        <Box
          sx={{
            display: "flex",
            flex: "1 0 auto",
            justifyContent: "space-between",
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            sx={{
              marginLeft: "auto",
            }}
          >
            <IconButton
              aria-label="delete"
              size="large"
              onClick={deleteSelectedTasks}
            >
              <Delete fontSize="inherit" color="error" />
            </IconButton>
            <IconButton
              aria-label="add"
              size="large"
              onClick={() => setShowAddModal(true)}
            >
              <Add fontSize="inherit" />
            </IconButton>
            <IconButton
              aria-label="menu"
              size="large"
              onClick={() => setShowMenuModal(!showMenuModal)}
            >
              {showMenuModal ? (
                <MenuOpen fontSize="inherit" />
              ) : (
                <Menu fontSize="inherit" />
              )}
            </IconButton>
            {/*TODO change state*/}
          </Stack>
        </Box>
      </Box>

      {/* Content */}
      <main>
        <TaskList taskIDs={taskIds} />
        <p>Task.subTaskIds</p>
        <Button onClick={currentSubTaskIds}>refresh</Button>
        <List>
          {checkedSubtasks.map((id) => (
            <ListItem>{id}</ListItem>
          ))}
        </List>
      </main>
      {/* Modal */}
      <AddTaskModal
        taskId={getFirstCheckedId() || "root"}
        showAddModal={showAddModal}
        setShowAddModal={setShowAddModal}
      />
      <MenuModal
        showMenuModal={showMenuModal}
        setShowMenuModal={setShowMenuModal}
        taskId={getFirstCheckedId()}
      ></MenuModal>
    </Container>
  );
};

export default App;
