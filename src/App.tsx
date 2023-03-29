import React from "react";

import { Container, Typography } from "@mui/material";

import TaskComponent from "./components/TaskComponent";

function App() {
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
        <TaskComponent taskID="root" />
      </main>
    </Container>
  );
}

export default App;
