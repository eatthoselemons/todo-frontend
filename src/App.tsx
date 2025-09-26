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
import {
  CheckboxContext,
  CheckboxContextProvider,
} from "./context/CheckboxContext";
import useTaskHooks from "./hooks/useTaskHooks";
import { useTaskContext } from "./context/TaskContext";
import { MenuModal } from "./components/MenuModal";

const App: React.FC = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [taskIds, setTaskIds] = useState<TaskID[]>([]);
  const { checkedItems } = useContext(CheckboxContext);

  const { getTaskById, getRootTaskIds, deleteTasks, getImmediateChildren } = useTaskHooks();
  const { db } = useTaskContext();

  useEffect(() => {
    getRootTaskIds().then(setTaskIds);
  }, []);

  const getFirstCheckedId = () => {
    return Object.keys(checkedItems).filter((key) => checkedItems[key])[0];
  };


  const deleteSelectedTasks = useCallback(() => {
    Promise.resolve(
      Object.keys(checkedItems).filter((id) => checkedItems[id])
    ).then(deleteTasks).catch((error) => {
      console.error("Failed to delete tasks:", error);
      alert(`Failed to delete tasks: ${error.message}`);
    });
  }, [checkedItems]);

  const [checkedSubtasks, setCheckedSubtasks] = useState<String[]>([]);
  const currentSubTaskIds = async () => {
    const children = await getImmediateChildren(getFirstCheckedId());
    setCheckedSubtasks(children.map(child => child.id));
  };

  // Watch for ANY database changes and refresh root tasks
  useEffect(() => {
    const changes = db
      .changes({
        since: "now",
        live: true,
      })
      .on("change", () => {
        // Any change could affect root tasks, so just refresh
        getRootTaskIds().then(setTaskIds);
      });

    return () => changes.cancel();
  }, [db, getRootTaskIds]);

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
        <p>Task children (path-based)</p>
        <Button onClick={currentSubTaskIds}>refresh</Button>
        <List>
          {checkedSubtasks.map((id) => (
            <ListItem>{id}</ListItem>
          ))}
        </List>
      </main>
      {/* Modal */}
      <AddTaskModal
        parentTaskId={getFirstCheckedId() || "root"}
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
