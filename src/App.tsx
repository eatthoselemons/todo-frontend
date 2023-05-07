import React, { useCallback, useContext, useEffect, useState } from "react";
import { Box, Container, IconButton, Stack, Typography } from "@mui/material";
import { Add, Delete } from "@mui/icons-material";
import TaskList from "./components/TaskList";
import { AddTaskModal } from "./components/AddTaskModal";
import { Task, TaskID } from "./domain/Task";
import { useTaskWatcher } from "./hooks/useTaskWatcher";
import {
  CheckboxContext,
  CheckboxContextProvider,
} from "./context/CheckboxContext";
import useTaskHooks from "./hooks/useTaskHooks";

const App: React.FC = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [taskIds, setTaskIds] = useState<TaskID[]>([]);
  const { checkedItems } = useContext(CheckboxContext);

  const { getRootTaskIds, deleteTasks } = useTaskHooks();

  useEffect(() => {
    getRootTaskIds().then(setTaskIds);
  }, []);

  const onRootTaskChange = useCallback((task: Task) => {
    setTaskIds(task.subTaskIds);
  }, []);

  const deleteSelectedTasks = useCallback(() => {
    Promise.resolve(
      Object.keys(checkedItems).filter((id) => checkedItems[id])
    ).then(deleteTasks);
  }, [checkedItems]);

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
            {/*TODO change state*/}
          </Stack>
        </Box>
      </Box>

      {/* Content */}
      <main>
        <TaskList taskIDs={taskIds} />
      </main>
      {/* Modal */}
      <AddTaskModal
        taskId="root"
        showAddModal={showAddModal}
        setShowAddModal={setShowAddModal}
      />
    </Container>
  );
};

export default App;
