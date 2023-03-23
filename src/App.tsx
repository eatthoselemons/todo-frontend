import React, { createRef, FormEventHandler, useEffect, useState } from "react";

import { Box, Container, Fab, TextField, Typography } from "@mui/material";
import TaskList from "./components/TaskList";
import { Task } from "./domain/Task";
import { createTask, getRootTasks } from "./service/TaskService";
import AddIcon from "@mui/icons-material/Add";

function App() {
  const newItem = createRef<HTMLInputElement>();

  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    getRootTasks().then(setTasks);
  }, []);

  const handleNewItem: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (newItem.current?.value) {
      const newTask = new Task(newItem.current.value);
      setTasks([...tasks, newTask]);
      // TODO Handle async nature with spinner?
      // TODO handle adding tasks to non root
      createTask("root", newTask);

      newItem.current.value = "";
    }
  };

  return (
    <Container
      sx={{
        position: "relative",
        minHeight: "100vh",
      }}
    >
      <header>
        <Typography variant="h3">Liz'z Lemons</Typography>
      </header>
      <main>
        <TaskList tasks={tasks} />
      </main>
      <footer>
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            width: "100%",
          }}
        >
          <Box
            component="form"
            onSubmit={handleNewItem}
            sx={{
              flex: "1",
            }}
          >
            <TextField
              label="New Item"
              variant="standard"
              autoFocus
              autoComplete="on"
              autoCapitalize="words"
              inputRef={newItem}
              fullWidth={true}
            />
          </Box>
          <Fab
            color="primary"
            sx={{
              m: 1,
              mr: 0,
            }}
          >
            <AddIcon />
          </Fab>
        </Box>
      </footer>
    </Container>
  );
}

export default App;
